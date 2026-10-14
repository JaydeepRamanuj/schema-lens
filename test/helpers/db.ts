// ============================================================
// helpers/db.ts — isolated test databases loaded with the fixture.
//
//   const db = await createTestDb();   // in beforeAll
//   ... connect to db.url ...
//   await db.cleanup();                // in afterAll
//
// Real Postgres: each call creates its own database `t_<random>` and drops it
// on cleanup, so test files can run in parallel.
// PGlite: the socket server serves a single database (connecting to any other
// name lands in `postgres`), so the fixture schemas are reset in place
// instead. Integration files therefore run serially (see
// vitest.integration.config.ts). PGlite is single-process Postgres: skip
// concurrency tests when `isPglite` is true.
// ============================================================

import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { inject } from "vitest";

export const FIXTURE_PATH = fileURLToPath(new URL("../fixtures/schema.sql", import.meta.url));

/** Schemas created by the fixture. */
export const FIXTURE_SCHEMAS = ["public", "analytics"];

export interface TestDb {
  /** Connection URL for the database holding the fixture. */
  url: string;
  /** True when running on PGlite rather than a real Postgres server. */
  isPglite: boolean;
  /** Drops the database (real Postgres) or the fixture schemas (PGlite). */
  cleanup(): Promise<void>;
}

export function loadFixture(client: pg.Client): Promise<unknown> {
  return client.query(readFileSync(FIXTURE_PATH, "utf8"));
}

async function withClient<T>(url: string, fn: (client: pg.Client) => Promise<T>): Promise<T> {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

async function resetFixtureSchemas(client: pg.Client): Promise<void> {
  await client.query(`
    DROP SCHEMA IF EXISTS analytics CASCADE;
    DROP SCHEMA IF EXISTS public CASCADE;
    CREATE SCHEMA public;
  `);
}

export async function createTestDb(): Promise<TestDb> {
  const adminUrl = inject("dbAdminUrl");

  const isPglite = await withClient(adminUrl, async (admin) => {
    const { rows } = await admin.query<{ version: string }>("SELECT version()");
    return rows[0]?.version.includes("PGlite") ?? false;
  });

  if (isPglite) {
    await withClient(adminUrl, async (client) => {
      await resetFixtureSchemas(client);
      await loadFixture(client);
    });
    return {
      url: adminUrl,
      isPglite,
      cleanup: () => withClient(adminUrl, resetFixtureSchemas),
    };
  }

  const dbName = `t_${randomBytes(6).toString("hex")}`;
  await withClient(adminUrl, (admin) => admin.query(`CREATE DATABASE ${dbName}`));

  const url = new URL(adminUrl);
  url.pathname = `/${dbName}`;
  const testUrl = url.toString();

  await withClient(testUrl, async (client) => {
    const { rows } = await client.query<{ db: string }>("SELECT current_database() AS db");
    if (rows[0]?.db !== dbName) {
      throw new Error(`Expected to connect to ${dbName}, got ${rows[0]?.db ?? "nothing"}`);
    }
    await loadFixture(client);
  });

  return {
    url: testUrl,
    isPglite,
    cleanup: async () => {
      await withClient(adminUrl, (admin) => admin.query(`DROP DATABASE IF EXISTS ${dbName} WITH (FORCE)`));
    },
  };
}
