// ============================================================
// integration/live.test.ts — end-to-end tests against a real DB.
// Requires: DBCTX_URL env var pointing to a live PostgreSQL instance.
// Run: DBCTX_URL=<url> npm run test:integration
// ============================================================

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import pg from "pg";
import { extract } from "../../src/core/extractor/custom.js";
import { normalize } from "../../src/core/normalize.js";
import { buildFingerprint, checkFreshness } from "../../src/core/freshness.js";
import { listTables, related, joinPath, getEnums } from "../../src/core/queries.js";

const DB_URL = process.env["DBCTX_URL"];

// Skip the entire suite if no URL is provided
const runSuite = !!DB_URL;

describe.skipIf(!runSuite)("Live database integration", () => {
  let client: pg.Client;
  const schemas = ["public"];

  beforeAll(async () => {
    if (!DB_URL) return;
    client = new pg.Client({ connectionString: DB_URL });
    await client.connect();
  });

  afterAll(async () => {
    if (client) await client.end();
  });

  it("connects to the database successfully", async () => {
    const result = await client.query<{ val: number }>("SELECT 1 AS val");
    expect(result.rows[0]?.val).toBe(1);
  });

  it("extract() returns tables, columns, and constraints", async () => {
    const raw = await extract(client, schemas);
    expect(raw.tables.length).toBeGreaterThan(0);
    expect(raw.columns.length).toBeGreaterThan(0);
  });

  it("normalize() produces a valid NormalizedSchema from live data", async () => {
    const raw = await extract(client, schemas);
    const schema = normalize(raw, {
      connectionId: "integration-test",
      dbName: "postgres",
      generatedAt: new Date().toISOString(),
    });

    expect(schema.meta.extractor).toBe("custom");
    expect(Object.keys(schema.tables).length).toBeGreaterThan(0);

    // All table keys should be schema-qualified
    for (const key of Object.keys(schema.tables)) {
      expect(key).toContain(".");
    }
  });

  it("buildFingerprint() returns a fingerprint with table hashes", async () => {
    const fp = await buildFingerprint(client, schemas);
    expect(Object.keys(fp.tables).length).toBeGreaterThan(0);
    expect(fp.verifiedAt).toBeTruthy();
    // Each hash should be a non-empty string
    for (const [, tableHash] of Object.entries(fp.tables)) {
      expect(tableHash.hash).toBeTruthy();
      expect(tableHash.hash.length).toBeGreaterThan(0);
    }
  });

  it("checkFreshness() returns fresh with matching fingerprint", async () => {
    const fp = await buildFingerprint(client, schemas);
    // Immediately re-check — should be fresh (TTL 0 to force the query)
    const { result } = await checkFreshness(client, schemas, fp, 0);
    expect(result.isFresh).toBe(true);
    expect(result.changedTables).toHaveLength(0);
    expect(result.newTables).toHaveLength(0);
    expect(result.droppedTables).toHaveLength(0);
  });

  it("listTables() returns results from live schema", async () => {
    const raw = await extract(client, schemas);
    const schema = normalize(raw, {
      connectionId: "integration-test",
      dbName: "postgres",
      generatedAt: new Date().toISOString(),
    });

    const result = listTables(schema);
    expect(result.total).toBeGreaterThan(0);
  });

  it("checkFreshness() detects TTL short-circuit", async () => {
    const fp = await buildFingerprint(client, schemas);
    // With a 60s TTL, just-built fingerprint should be served from cache
    const { result } = await checkFreshness(client, schemas, fp, 60);
    expect(result.isFresh).toBe(true);
  });

  it("extract() query runs in under 10 seconds on this schema", async () => {
    const start = Date.now();
    await extract(client, schemas);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(10_000);
  });

  it("fingerprint query runs in under 5 seconds on this schema", async () => {
    const start = Date.now();
    await buildFingerprint(client, schemas);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(5_000);
  });
});
