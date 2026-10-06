// ============================================================
// mcp/server.ts — MCP server exposing all dbctx query functions
// as typed MCP tools over the stdio transport.
//
// Run with: dbctx mcp-serve [--name <profile>] [--url <url>]
//
// Every tool that needs schema data calls ensureFreshSchema()
// which re-uses the existing on-disk cache and auto-refreshes
// when the snapshot is stale — exactly the same as the CLI.
//
// IMPORTANT: Never write to stdout here. All diagnostic output
// must go to stderr so it does not corrupt the JSON-RPC stream.
// ============================================================

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
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
} from "../core/store.js";
import { ensureFreshSchema, type ConnectionContext } from "../core/refresh.js";
import {
  listTables,
  describe,
  getColumns,
  getColumnConstraints,
  related,
  findColumns,
  findCommonColumns,
  joinPath,
  getEnums,
  getPolicies,
  buildStatus,
  searchSchema,
  findByType,
  findPolymorphic,
  checkIndex,
  findOrphans,
} from "../core/queries.js";
import type { NormalizedSchema, IncludeSection } from "../core/types.js";

// --------------- Connection context ---------------

function buildConnectionContext(opts: {
  url?: string;
  name?: string;
}): ConnectionContext {
  const config = loadConfig();
  const connOpts: { url?: string; name?: string } = {};
  if (opts.url !== undefined) connOpts.url = opts.url;
  if (opts.name !== undefined) connOpts.name = opts.name;
  const conn = resolveConnection(connOpts);

  return {
    url: conn.url,
    schemas: conn.schemas,
    connectionId: deriveConnectionId(conn.url),
    ttlSeconds: config.ttlSeconds ?? 5,
    isGlobal: process.env["DBCTX_GLOBAL"] === "1",
  };
}

// --------------- Tool response helper ---------------

/** Wrap any serializable result into an MCP text content block. */
function ok(data: unknown): { content: [{ type: "text"; text: string }] } {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
  };
}

function err(message: string): { content: [{ type: "text"; text: string }]; isError: true } {
  return {
    content: [{ type: "text", text: message }],
    isError: true,
  };
}

// --------------- Server factory ---------------

export async function startMcpServer(opts: {
  url?: string;
  name?: string;
}): Promise<void> {
  const ctx = buildConnectionContext(opts);

  const server = new McpServer({
    name: "dbctx",
    version: "0.1.0",
  });

  // ---- list_tables ----
  server.tool(
    "list_tables",
    "List all tables and views in the schema snapshot. Optionally filter by a name pattern (substring or regex).",
    {
      filter: z
        .string()
        .optional()
        .describe("Optional substring or regex to filter table names"),
      connection_name: z
        .string()
        .optional()
        .describe("Named profile from dbctx.config.json (overrides default)"),
    },
    async ({ filter, connection_name }) => {
      try {
        const resolvedCtx = connection_name
          ? buildConnectionContext({ name: connection_name })
          : ctx;
        const result = await ensureFreshSchema(resolvedCtx);
        return ok({
          ...listTables(result.schema, filter),
          _meta: { verifiedAt: result.verifiedAt, stale: result.stale },
        });
      } catch (e) {
        return err(e instanceof Error ? e.message : String(e));
      }
    }
  );

  // ---- describe_tables ----
  server.tool(
    "describe_tables",
    "Return full structural detail for one or more tables: columns, constraints, indexes, foreign keys, policies, and triggers.",
    {
      tables: z
        .array(z.string())
        .min(1)
        .describe("Table names to describe. Use 'schema.table' or bare table name (defaults to 'public' schema)."),
      include: z
        .array(z.enum(["columns", "constraints", "indexes", "fks", "policies", "triggers"]))
        .optional()
        .describe("Sections to include. Defaults to all sections."),
      connection_name: z
        .string()
        .optional()
        .describe("Named profile from dbctx.config.json (overrides default)"),
    },
    async ({ tables, include, connection_name }) => {
      try {
        const resolvedCtx = connection_name
          ? buildConnectionContext({ name: connection_name })
          : ctx;
        const result = await ensureFreshSchema(resolvedCtx);
        return ok({
          ...describe(result.schema, tables, include as IncludeSection[] | undefined),
          _meta: { verifiedAt: result.verifiedAt, stale: result.stale },
        });
      } catch (e) {
        return err(e instanceof Error ? e.message : String(e));
      }
    }
  );

  // ---- get_columns ----
  server.tool(
    "get_columns",
    "Return all columns for a single table, including type, nullability, default, and comment.",
    {
      table: z.string().describe("Table name (e.g. 'users' or 'public.users')"),
      connection_name: z
        .string()
        .optional()
        .describe("Named profile from dbctx.config.json (overrides default)"),
    },
    async ({ table, connection_name }) => {
      try {
        const resolvedCtx = connection_name
          ? buildConnectionContext({ name: connection_name })
          : ctx;
        const result = await ensureFreshSchema(resolvedCtx);
        return ok({
          table,
          columns: getColumns(result.schema, table),
          _meta: { verifiedAt: result.verifiedAt, stale: result.stale },
        });
      } catch (e) {
        return err(e instanceof Error ? e.message : String(e));
      }
    }
  );

  // ---- get_column_constraints ----
  server.tool(
    "get_column_constraints",
    "Return all constraints (PK, FK, UNIQUE, CHECK) that touch the specified columns on a table.",
    {
      table: z.string().describe("Table name"),
      columns: z
        .array(z.string())
        .min(1)
        .describe("Column names to find constraints for"),
      connection_name: z
        .string()
        .optional()
        .describe("Named profile from dbctx.config.json (overrides default)"),
    },
    async ({ table, columns, connection_name }) => {
      try {
        const resolvedCtx = connection_name
          ? buildConnectionContext({ name: connection_name })
          : ctx;
        const result = await ensureFreshSchema(resolvedCtx);
        return ok({
          table,
          columns,
          constraints: getColumnConstraints(result.schema, table, columns),
          _meta: { verifiedAt: result.verifiedAt, stale: result.stale },
        });
      } catch (e) {
        return err(e instanceof Error ? e.message : String(e));
      }
    }
  );

  // ---- get_related_tables ----
  server.tool(
    "get_related_tables",
    "Return tables that are directly connected to the given table via foreign keys (both incoming and outgoing), up to a configurable BFS depth.",
    {
      table: z.string().describe("Root table name"),
      depth: z
        .number()
        .int()
        .min(1)
        .max(5)
        .optional()
        .default(1)
        .describe("How many FK hops to traverse (default: 1)"),
      connection_name: z
        .string()
        .optional()
        .describe("Named profile from dbctx.config.json (overrides default)"),
    },
    async ({ table, depth, connection_name }) => {
      try {
        const resolvedCtx = connection_name
          ? buildConnectionContext({ name: connection_name })
          : ctx;
        const result = await ensureFreshSchema(resolvedCtx);
        return ok({
          ...related(result.schema, table, depth),
          _meta: { verifiedAt: result.verifiedAt, stale: result.stale },
        });
      } catch (e) {
        return err(e instanceof Error ? e.message : String(e));
      }
    }
  );

  // ---- find_columns ----
  server.tool(
    "find_columns",
    "Search all tables for columns whose name matches a given substring or regex pattern.",
    {
      pattern: z.string().describe("Substring or regex pattern to match column names"),
      connection_name: z
        .string()
        .optional()
        .describe("Named profile from dbctx.config.json (overrides default)"),
    },
    async ({ pattern, connection_name }) => {
      try {
        const resolvedCtx = connection_name
          ? buildConnectionContext({ name: connection_name })
          : ctx;
        const result = await ensureFreshSchema(resolvedCtx);
        return ok({
          ...findColumns(result.schema, pattern),
          _meta: { verifiedAt: result.verifiedAt, stale: result.stale },
        });
      } catch (e) {
        return err(e instanceof Error ? e.message : String(e));
      }
    }
  );

  // ---- find_common_columns ----
  server.tool(
    "find_common_columns",
    "Find column names that exist in ALL of the specified tables. Useful for identifying shared keys across tables before writing JOINs.",
    {
      tables: z
        .array(z.string())
        .min(2)
        .describe("Two or more table names to compare"),
      pattern: z
        .string()
        .optional()
        .describe("Optional regex to further filter the common columns"),
      connection_name: z
        .string()
        .optional()
        .describe("Named profile from dbctx.config.json (overrides default)"),
    },
    async ({ tables, pattern, connection_name }) => {
      try {
        const resolvedCtx = connection_name
          ? buildConnectionContext({ name: connection_name })
          : ctx;
        const result = await ensureFreshSchema(resolvedCtx);
        return ok({
          ...findCommonColumns(result.schema, tables, pattern),
          _meta: { verifiedAt: result.verifiedAt, stale: result.stale },
        });
      } catch (e) {
        return err(e instanceof Error ? e.message : String(e));
      }
    }
  );

  // ---- join_path ----
  server.tool(
    "join_path",
    "Find the shortest foreign-key path between two tables. Returns the table chain and the join columns at each hop. Returns null path if no FK path exists.",
    {
      from: z.string().describe("Starting table name"),
      to: z.string().describe("Target table name"),
      connection_name: z
        .string()
        .optional()
        .describe("Named profile from dbctx.config.json (overrides default)"),
    },
    async ({ from, to, connection_name }) => {
      try {
        const resolvedCtx = connection_name
          ? buildConnectionContext({ name: connection_name })
          : ctx;
        const result = await ensureFreshSchema(resolvedCtx);
        const jp = joinPath(result.schema, from, to);
        if (!jp.path) {
          return err(`No FK path found between ${from} and ${to}`);
        }
        return ok({
          ...jp,
          _meta: { verifiedAt: result.verifiedAt, stale: result.stale },
        });
      } catch (e) {
        return err(e instanceof Error ? e.message : String(e));
      }
    }
  );

  // ---- get_enums ----
  server.tool(
    "get_enums",
    "List all PostgreSQL enum types and their allowed values. Optionally filter by enum name.",
    {
      name: z
        .string()
        .optional()
        .describe("Optional enum name to filter (substring match)"),
      connection_name: z
        .string()
        .optional()
        .describe("Named profile from dbctx.config.json (overrides default)"),
    },
    async ({ name, connection_name }) => {
      try {
        const resolvedCtx = connection_name
          ? buildConnectionContext({ name: connection_name })
          : ctx;
        const result = await ensureFreshSchema(resolvedCtx);
        return ok({
          ...getEnums(result.schema, name),
          _meta: { verifiedAt: result.verifiedAt, stale: result.stale },
        });
      } catch (e) {
        return err(e instanceof Error ? e.message : String(e));
      }
    }
  );

  // ---- get_policies ----
  server.tool(
    "get_policies",
    "Return all Row-Level Security (RLS) policies. Optionally filter to a specific table.",
    {
      table: z
        .string()
        .optional()
        .describe("Optional table name to filter policies"),
      connection_name: z
        .string()
        .optional()
        .describe("Named profile from dbctx.config.json (overrides default)"),
    },
    async ({ table, connection_name }) => {
      try {
        const resolvedCtx = connection_name
          ? buildConnectionContext({ name: connection_name })
          : ctx;
        const result = await ensureFreshSchema(resolvedCtx);
        return ok({
          ...getPolicies(result.schema, table),
          _meta: { verifiedAt: result.verifiedAt, stale: result.stale },
        });
      } catch (e) {
        return err(e instanceof Error ? e.message : String(e));
      }
    }
  );

  // ---- search_schema ----
  server.tool(
    "search_schema",
    "Global full-text search across all table names, column names, comments, and enum names/values. Use this to discover where a concept lives in the schema.",
    {
      keyword: z.string().describe("Search term (substring or regex)"),
      connection_name: z
        .string()
        .optional()
        .describe("Named profile from dbctx.config.json (overrides default)"),
    },
    async ({ keyword, connection_name }) => {
      try {
        const resolvedCtx = connection_name
          ? buildConnectionContext({ name: connection_name })
          : ctx;
        const result = await ensureFreshSchema(resolvedCtx);
        return ok({
          ...searchSchema(result.schema, keyword),
          _meta: { verifiedAt: result.verifiedAt, stale: result.stale },
        });
      } catch (e) {
        return err(e instanceof Error ? e.message : String(e));
      }
    }
  );

  // ---- find_by_type ----
  server.tool(
    "find_by_type",
    "Find all columns across all tables that use a specific PostgreSQL data type (e.g. 'uuid', 'jsonb', 'numeric').",
    {
      type: z.string().describe("Data type keyword to search for (e.g. 'uuid', 'jsonb')"),
      connection_name: z
        .string()
        .optional()
        .describe("Named profile from dbctx.config.json (overrides default)"),
    },
    async ({ type, connection_name }) => {
      try {
        const resolvedCtx = connection_name
          ? buildConnectionContext({ name: connection_name })
          : ctx;
        const result = await ensureFreshSchema(resolvedCtx);
        return ok({
          ...findByType(result.schema, type),
          _meta: { verifiedAt: result.verifiedAt, stale: result.stale },
        });
      } catch (e) {
        return err(e instanceof Error ? e.message : String(e));
      }
    }
  );

  // ---- find_polymorphic ----
  server.tool(
    "find_polymorphic",
    "Scan all tables for polymorphic association patterns — column pairs like 'item_type' + 'item_id'.",
    {
      connection_name: z
        .string()
        .optional()
        .describe("Named profile from dbctx.config.json (overrides default)"),
    },
    async ({ connection_name }) => {
      try {
        const resolvedCtx = connection_name
          ? buildConnectionContext({ name: connection_name })
          : ctx;
        const result = await ensureFreshSchema(resolvedCtx);
        return ok({
          ...findPolymorphic(result.schema),
          _meta: { verifiedAt: result.verifiedAt, stale: result.stale },
        });
      } catch (e) {
        return err(e instanceof Error ? e.message : String(e));
      }
    }
  );

  // ---- check_index ----
  server.tool(
    "check_index",
    "Check whether a covering index exists for a given set of columns on a table. Returns the matching index if found, or partial matches otherwise.",
    {
      table: z.string().describe("Table name to check"),
      columns: z
        .array(z.string())
        .min(1)
        .describe("Column names in query order (prefix matters for B-tree indexes)"),
      connection_name: z
        .string()
        .optional()
        .describe("Named profile from dbctx.config.json (overrides default)"),
    },
    async ({ table, columns, connection_name }) => {
      try {
        const resolvedCtx = connection_name
          ? buildConnectionContext({ name: connection_name })
          : ctx;
        const result = await ensureFreshSchema(resolvedCtx);
        return ok({
          ...checkIndex(result.schema, table, columns),
          _meta: { verifiedAt: result.verifiedAt, stale: result.stale },
        });
      } catch (e) {
        return err(e instanceof Error ? e.message : String(e));
      }
    }
  );

  // ---- find_orphans ----
  server.tool(
    "find_orphans",
    "Find tables that have no incoming or outgoing foreign key relationships — they are isolated from the rest of the schema.",
    {
      connection_name: z
        .string()
        .optional()
        .describe("Named profile from dbctx.config.json (overrides default)"),
    },
    async ({ connection_name }) => {
      try {
        const resolvedCtx = connection_name
          ? buildConnectionContext({ name: connection_name })
          : ctx;
        const result = await ensureFreshSchema(resolvedCtx);
        return ok({
          ...findOrphans(result.schema),
          _meta: { verifiedAt: result.verifiedAt, stale: result.stale },
        });
      } catch (e) {
        return err(e instanceof Error ? e.message : String(e));
      }
    }
  );

  // ---- get_status ----
  server.tool(
    "get_status",
    "Return snapshot metadata: age, table count, whether the DB is reachable, and whether the cache is stale.",
    {
      connection_name: z
        .string()
        .optional()
        .describe("Named profile from dbctx.config.json (overrides default)"),
    },
    async ({ connection_name }) => {
      try {
        const resolvedCtx = connection_name
          ? buildConnectionContext({ name: connection_name })
          : ctx;
        const storeOpts = { isGlobal: resolvedCtx.isGlobal };
        const fp = await readFingerprint(resolvedCtx.connectionId, storeOpts);
        const schema = await readSchema(resolvedCtx.connectionId, storeOpts);

        let dbReachable = false;
        try {
          const client = new pg.Client({ connectionString: resolvedCtx.url });
          await client.connect();
          await client.query("SELECT 1");
          await client.end();
          dbReachable = true;
        } catch {
          dbReachable = false;
        }

        return ok(buildStatus(resolvedCtx.connectionId, fp, schema, dbReachable));
      } catch (e) {
        return err(e instanceof Error ? e.message : String(e));
      }
    }
  );

  // ---- Connect transport ----
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("[dbctx mcp] Server running on stdio. connectionId:", ctx.connectionId);
}
