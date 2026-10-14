// ============================================================
// refresh.ts — core schema freshness/refresh logic
// Shared between CLI and MCP server.
// ============================================================

import pg from "pg";
import { extract } from "./extractor/custom.js";
import { normalize } from "./normalize.js";
import {
  readSchema,
  writeSchema,
  readFingerprint,
  writeFingerprint,
  writeRaw,
  acquireLock,
} from "./store.js";
import { checkFreshness, buildFingerprint } from "./freshness.js";
import type { NormalizedSchema, Fingerprint } from "./types.js";

export interface ConnectionContext {
  url: string;
  schemas: string[];
  connectionId: string;
  ttlSeconds: number;
  isGlobal?: boolean | undefined;
}

export interface RefreshResult {
  schema: NormalizedSchema;
  refreshed: boolean;
  stale: boolean;
  staleReason?: string;
  verifiedAt: string;
}

async function makeClient(url: string): Promise<pg.Client> {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  return client;
}

/**
 * Core read flow: check freshness, refresh if needed, return schema + metadata.
 */
export async function ensureFreshSchema(
  ctx: ConnectionContext,
  force = false
): Promise<RefreshResult> {
  const storeOpts = { isGlobal: ctx.isGlobal };
  const storedFp = await readFingerprint(ctx.connectionId, storeOpts);
  const storedSchema = await readSchema(ctx.connectionId, storeOpts);

  // Force re-extract
  if (force || !storedSchema) {
    return await doFullRefresh(ctx);
  }

  // Try to connect and check freshness
  let client: pg.Client | null = null;
  try {
    client = await makeClient(ctx.url);
  } catch {
    // DB unreachable — serve stale cache
    if (storedSchema) {
      return {
        schema: storedSchema,
        refreshed: false,
        stale: true,
        staleReason: "db unreachable",
        verifiedAt: storedFp?.verifiedAt ?? new Date().toISOString(),
      };
    }
    throw new Error(
      "Database is unreachable and no cached snapshot exists.\n" +
        "Run 'dbctx init' when the DB is available first."
    );
  }

  try {
    const { result, newFingerprint } = await checkFreshness(
      client,
      ctx.schemas,
      storedFp,
      ctx.ttlSeconds
    );

    if (result.wasDbUnreachable) {
      return {
        schema: storedSchema,
        refreshed: false,
        stale: true,
        staleReason: "db unreachable",
        verifiedAt: storedFp?.verifiedAt ?? new Date().toISOString(),
      };
    }

    if (result.isFresh) {
      // Update verifiedAt in fingerprint even if nothing changed
      if (newFingerprint) {
        await writeFingerprint(ctx.connectionId, newFingerprint, storeOpts);
      }
      return {
        schema: storedSchema,
        refreshed: false,
        stale: false,
        verifiedAt: newFingerprint?.verifiedAt ?? storedFp?.verifiedAt ?? new Date().toISOString(),
      };
    }

    // Schema changed — re-extract
    return await doRefreshWithClient(client, ctx, newFingerprint);
  } finally {
    await client.end().catch(() => undefined);
  }
}

export async function doFullRefresh(ctx: ConnectionContext): Promise<RefreshResult> {
  const client = await makeClient(ctx.url);
  try {
    return await doRefreshWithClient(client, ctx, null);
  } finally {
    await client.end().catch(() => undefined);
  }
}

async function doRefreshWithClient(
  client: pg.Client,
  ctx: ConnectionContext,
  existingFp: Fingerprint | null
): Promise<RefreshResult> {
  const storeOpts = { isGlobal: ctx.isGlobal };
  const release = await acquireLock(ctx.connectionId, storeOpts);
  try {
    const rawData = await extract(client, ctx.schemas);
    await writeRaw(ctx.connectionId, rawData, storeOpts);

    // Get DB name
    const dbRes = await client.query<{ current_database: string }>(
      "SELECT current_database()"
    );
    const dbName = dbRes.rows[0]?.current_database ?? "unknown";

    const schema = normalize(rawData, {
      connectionId: ctx.connectionId,
      dbName,
      generatedAt: new Date().toISOString(),
    });

    const fp = await buildFingerprint(client, ctx.schemas);

    await writeSchema(ctx.connectionId, schema, storeOpts);
    await writeFingerprint(ctx.connectionId, fp, storeOpts);

    return {
      schema,
      refreshed: true,
      stale: false,
      verifiedAt: fp.verifiedAt,
    };
  } finally {
    await release();
  }
}
