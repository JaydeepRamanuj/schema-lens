// ============================================================
// cli/index.ts — commander entry point.
// Each command: resolve connection → freshness check → refresh if needed
//               → load schema → query fn → format → stdout
// ============================================================

import { Command } from "commander";
import pg from "pg";
import { loadConfig, resolveConnection } from "../core/config.js";
import { extract } from "../core/extractor/custom.js";
import { normalize } from "../core/normalize.js";
import {
  readSchema,
  writeSchema,
  readFingerprint,
  writeFingerprint,
  writeRaw,
  acquireLock,
  deriveConnectionId,
  getStoreInfo,
} from "../core/store.js";
import { checkFreshness, buildFingerprint } from "../core/freshness.js";
import {
  listTables,
  describe,
  getColumns,
  getColumnConstraints,
  related,
  findColumns,
  joinPath,
  getEnums,
  getPolicies,
  buildStatus,
} from "../core/queries.js";
import {
  formatOutput,
  compactDescribe,
  mdDescribe,
  freshnessFooter,
} from "./formatters.js";
import type { OutputFormat, NormalizedSchema, IncludeSection } from "../core/types.js";

// --------------- Shared connection + refresh helper ---------------

interface ConnectionContext {
  url: string;
  schemas: string[];
  connectionId: string;
  format: OutputFormat;
  ttlSeconds: number;
}

async function resolveCtx(opts: {
  url?: string;
  name?: string;
  format?: string;
}): Promise<ConnectionContext> {
  const config = loadConfig();
  const connOpts: { url?: string; name?: string } = {};
  if (opts.url !== undefined) connOpts.url = opts.url;
  if (opts.name !== undefined) connOpts.name = opts.name;
  const conn = resolveConnection(connOpts);
  const format = (opts.format as OutputFormat | undefined) ??
    config.defaultFormat ?? "compact";

  return {
    url: conn.url,
    schemas: conn.schemas,
    connectionId: deriveConnectionId(conn.url),
    format,
    ttlSeconds: config.ttlSeconds ?? 5,
  };
}

type FreshnessInfo = { verifiedAt: string; refreshed: boolean; stale: boolean; staleReason?: string };

function makeFi(result: RefreshResult): FreshnessInfo {
  const fi: FreshnessInfo = {
    verifiedAt: result.verifiedAt,
    refreshed: result.refreshed,
    stale: result.stale,
  };
  if (result.staleReason !== undefined) fi.staleReason = result.staleReason;
  return fi;
}

async function makeClient(url: string): Promise<pg.Client> {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  return client;
}

interface RefreshResult {
  schema: NormalizedSchema;
  refreshed: boolean;
  stale: boolean;
  staleReason?: string;
  verifiedAt: string;
}

/**
 * Core read flow: check freshness, refresh if needed, return schema + metadata.
 */
async function ensureFreshSchema(
  ctx: ConnectionContext,
  force = false
): Promise<RefreshResult> {
  const storedFp = await readFingerprint(ctx.connectionId);
  const storedSchema = await readSchema(ctx.connectionId);

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
        await writeFingerprint(ctx.connectionId, newFingerprint);
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

async function doFullRefresh(ctx: ConnectionContext): Promise<RefreshResult> {
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
  existingFp: import("../core/types.js").Fingerprint | null
): Promise<RefreshResult> {
  const release = await acquireLock(ctx.connectionId);
  try {
    const rawData = await extract(client, ctx.schemas);
    await writeRaw(ctx.connectionId, rawData);

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

    await writeSchema(ctx.connectionId, schema);
    await writeFingerprint(ctx.connectionId, fp);

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

// --------------- CLI Program ---------------

const program = new Command();

program
  .name("dbctx")
  .description("Local PostgreSQL schema store for coding agents")
  .version("0.1.0");

// Global options (inherited by all subcommands)
const globalOptions = (cmd: Command) =>
  cmd
    .option("--url <postgres-url>", "Connection URL (overrides config + env)")
    .option("--name <profile>", "Named profile from dbctx.config.json")
    .option("--format <format>", "Output format: json | md | compact");

// ---- init ----
globalOptions(
  program
    .command("init")
    .description("Create a connection profile and take the first snapshot")
).action(async (opts) => {
  try {
    const ctx = await resolveCtx(opts);
    console.log(`Connecting to database...`);
    const result = await doFullRefresh(ctx);
    const tableCount = Object.keys(result.schema.tables).length;
    console.log(
      `✓ Snapshot created. ${tableCount} tables captured.\n` +
        `  Connection ID: ${ctx.connectionId}\n` +
        `  Verified at: ${result.verifiedAt}`
    );
  } catch (err) {
    console.error(`Error: ${String(err)}`);
    process.exit(1);
  }
});

// ---- refresh ----
globalOptions(
  program
    .command("refresh")
    .description("Force re-extract the schema from the database")
    .option("--force", "Skip freshness check and always re-extract")
).action(async (opts) => {
  try {
    const ctx = await resolveCtx(opts);
    const result = await ensureFreshSchema(ctx, opts.force ?? true);
    const tableCount = Object.keys(result.schema.tables).length;
    console.log(
      `✓ Refreshed. ${tableCount} tables.\n  Verified at: ${result.verifiedAt}`
    );
  } catch (err) {
    console.error(`Error: ${String(err)}`);
    process.exit(1);
  }
});

// ---- status ----
globalOptions(
  program
    .command("status")
    .description("Show snapshot age, DB reachability, and fingerprint state")
).action(async (opts) => {
  try {
    const ctx = await resolveCtx(opts);
    const fp = await readFingerprint(ctx.connectionId);
    const schema = await readSchema(ctx.connectionId);

    let dbReachable = false;
    try {
      const client = await makeClient(ctx.url);
      await client.query("SELECT 1");
      await client.end();
      dbReachable = true;
    } catch {
      dbReachable = false;
    }

    const status = buildStatus(ctx.connectionId, fp, schema, dbReachable);
    console.log(formatOutput(ctx.format, status, {
      verifiedAt: status.verifiedAt ?? new Date().toISOString(),
      refreshed: false,
      stale: status.stale,
    }));
  } catch (err) {
    console.error(`Error: ${String(err)}`);
    process.exit(1);
  }
});

// ---- tables ----
globalOptions(
  program
    .command("tables")
    .description("List all tables in the snapshot")
    .option("--filter <pattern>", "Filter by name (substring or regex)")
).action(async (opts) => {
  try {
    const ctx = await resolveCtx(opts);
    const result = await ensureFreshSchema(ctx);
    const queryResult = listTables(result.schema, opts.filter);

    const fi = makeFi(result);

    if (ctx.format === "compact") {
      const lines = queryResult.tables.map(
        (t) => `${t.name} (${t.type})${t.comment ? `  -- ${t.comment}` : ""}`
      );
      console.log(lines.join("\n") + "\n" + freshnessFooter(fi));
    } else if (ctx.format === "md") {
      const header = `| Table | Type | Comment |\n| --- | --- | --- |`;
      const rows = queryResult.tables
        .map((t) => `| ${t.name} | ${t.type} | ${t.comment ?? ""} |`)
        .join("\n");
      console.log(header + "\n" + rows + "\n" + freshnessFooter(fi));
    } else {
      console.log(formatOutput(ctx.format, queryResult, fi));
    }
  } catch (err) {
    console.error(`Error: ${String(err)}`);
    process.exit(1);
  }
});

// ---- describe ----
globalOptions(
  program
    .command("describe <tables...>")
    .description("Full detail for one or more tables")
    .option(
      "--include <sections>",
      "Comma-separated: columns,constraints,indexes,fks,policies,triggers"
    )
).action(async (tables: string[], opts) => {
  try {
    const ctx = await resolveCtx(opts);
    const result = await ensureFreshSchema(ctx);

    const include = opts.include
      ? (opts.include.split(",").map((s: string) => s.trim()) as IncludeSection[])
      : undefined;

    const queryResult = describe(result.schema, tables, include);
    const fi = makeFi(result);

    if (ctx.format === "compact") {
      console.log(compactDescribe(queryResult.tables) + "\n" + freshnessFooter(fi));
    } else if (ctx.format === "md") {
      console.log(mdDescribe(queryResult.tables) + "\n" + freshnessFooter(fi));
    } else {
      console.log(formatOutput(ctx.format, queryResult, fi));
    }
  } catch (err) {
    console.error(`Error: ${String(err)}`);
    process.exit(1);
  }
});

// ---- columns ----
globalOptions(
  program
    .command("columns <table>")
    .description("List columns for a table")
).action(async (table: string, opts) => {
  try {
    const ctx = await resolveCtx(opts);
    const result = await ensureFreshSchema(ctx);
    const cols = getColumns(result.schema, table);
    const fi = { verifiedAt: result.verifiedAt, refreshed: result.refreshed, stale: result.stale };

    if (ctx.format === "compact") {
      const lines = cols.map(
        (c) =>
          `  ${c.name} ${c.type}${c.nullable ? "" : " not null"}${c.default ? ` default ${c.default}` : ""}`
      );
      console.log(lines.join("\n") + "\n" + freshnessFooter(fi));
    } else {
      console.log(formatOutput(ctx.format, cols, fi));
    }
  } catch (err) {
    console.error(`Error: ${String(err)}`);
    process.exit(1);
  }
});

// ---- constraints ----
globalOptions(
  program
    .command("constraints <table>")
    .description("Show constraints for a table")
    .option("--columns <cols>", "Comma-separated column names to filter")
).action(async (table: string, opts) => {
  try {
    const ctx = await resolveCtx(opts);
    const result = await ensureFreshSchema(ctx);

    const cols = opts.columns
      ? opts.columns.split(",").map((c: string) => c.trim())
      : undefined;

    const constraints = cols
      ? getColumnConstraints(result.schema, table, cols)
      : describe(result.schema, [table], ["constraints"]).tables[
          table.includes(".") ? table : `public.${table}`
        ]?.constraints ?? [];

    const fi = { verifiedAt: result.verifiedAt, refreshed: result.refreshed, stale: result.stale };
    console.log(formatOutput(ctx.format, constraints, fi));
  } catch (err) {
    console.error(`Error: ${String(err)}`);
    process.exit(1);
  }
});

// ---- related ----
globalOptions(
  program
    .command("related <table>")
    .description("Show FK neighbors (both directions)")
    .option("--depth <n>", "Traversal depth (default: 1)", "1")
).action(async (table: string, opts) => {
  try {
    const ctx = await resolveCtx(opts);
    const result = await ensureFreshSchema(ctx);
    const depth = parseInt(opts.depth ?? "1", 10);
    const rel = related(result.schema, table, depth);
    const fi = { verifiedAt: result.verifiedAt, refreshed: result.refreshed, stale: result.stale };

    if (ctx.format === "compact") {
      const lines: string[] = [`${rel.root} (depth: ${rel.depth})`];
      for (const edge of rel.edges) {
        lines.push(`  ${edge.from} → ${edge.to}  via (${edge.via.join(", ")})`);
      }
      console.log(lines.join("\n") + "\n" + freshnessFooter(fi));
    } else {
      console.log(formatOutput(ctx.format, rel, fi));
    }
  } catch (err) {
    console.error(`Error: ${String(err)}`);
    process.exit(1);
  }
});

// ---- find-column ----
globalOptions(
  program
    .command("find-column <pattern>")
    .description("Find tables containing a column matching a pattern")
).action(async (pattern: string, opts) => {
  try {
    const ctx = await resolveCtx(opts);
    const result = await ensureFreshSchema(ctx);
    const found = findColumns(result.schema, pattern);
    const fi = { verifiedAt: result.verifiedAt, refreshed: result.refreshed, stale: result.stale };

    if (ctx.format === "compact") {
      const lines = found.matches.map(
        (m) => `${m.table}.${m.column.name}  (${m.column.type})`
      );
      console.log(
        (lines.length ? lines.join("\n") : "(no matches)") +
          "\n" +
          freshnessFooter(fi)
      );
    } else {
      console.log(formatOutput(ctx.format, found, fi));
    }
  } catch (err) {
    console.error(`Error: ${String(err)}`);
    process.exit(1);
  }
});

// ---- join-path ----
globalOptions(
  program
    .command("join-path <from> <to>")
    .description("Find the shortest FK path between two tables")
).action(async (from: string, to: string, opts) => {
  try {
    const ctx = await resolveCtx(opts);
    const result = await ensureFreshSchema(ctx);
    const jp = joinPath(result.schema, from, to);
    const fi = { verifiedAt: result.verifiedAt, refreshed: result.refreshed, stale: result.stale };

    if (ctx.format === "compact") {
      if (!jp.path) {
        console.log(`No FK path found between ${jp.from} and ${jp.to}\n` + freshnessFooter(fi));
      } else {
        const pathStr = jp.path.join(" → ");
        const edgeDetails = jp.edges.map(
          (e) => `  ${e.from} → ${e.to}  via (${e.via.join(", ")})`
        );
        console.log([pathStr, ...edgeDetails, freshnessFooter(fi)].join("\n"));
      }
    } else {
      console.log(formatOutput(ctx.format, jp, fi));
    }
  } catch (err) {
    console.error(`Error: ${String(err)}`);
    process.exit(1);
  }
});

// ---- enums ----
globalOptions(
  program
    .command("enums [name]")
    .description("List enum types and their values")
).action(async (name: string | undefined, opts) => {
  try {
    const ctx = await resolveCtx(opts);
    const result = await ensureFreshSchema(ctx);
    const enums = getEnums(result.schema, name);
    const fi = { verifiedAt: result.verifiedAt, refreshed: result.refreshed, stale: result.stale };

    if (ctx.format === "compact") {
      const lines = Object.entries(enums.enums).map(
        ([key, def]) => `${key}: ${def.values.join(", ")}`
      );
      console.log(
        (lines.length ? lines.join("\n") : "(no enums)") +
          "\n" +
          freshnessFooter(fi)
      );
    } else {
      console.log(formatOutput(ctx.format, enums, fi));
    }
  } catch (err) {
    console.error(`Error: ${String(err)}`);
    process.exit(1);
  }
});

// ---- policies ----
globalOptions(
  program
    .command("policies [table]")
    .description("Show RLS policies, optionally filtered by table")
).action(async (table: string | undefined, opts) => {
  try {
    const ctx = await resolveCtx(opts);
    const result = await ensureFreshSchema(ctx);
    const pols = getPolicies(result.schema, table);
    const fi = { verifiedAt: result.verifiedAt, refreshed: result.refreshed, stale: result.stale };

    if (ctx.format === "compact") {
      if (pols.policies.length === 0) {
        console.log("(no RLS policies)\n" + freshnessFooter(fi));
      } else {
        const lines = pols.policies.map(
          (p) =>
            `${p.table}: ${p.policy.name} (${p.policy.cmd}, ${p.policy.permissive ? "permissive" : "restrictive"})`
        );
        console.log(lines.join("\n") + "\n" + freshnessFooter(fi));
      }
    } else {
      console.log(formatOutput(ctx.format, pols, fi));
    }
  } catch (err) {
    console.error(`Error: ${String(err)}`);
    process.exit(1);
  }
});

// --------------- Run ---------------

program.parse(process.argv);
