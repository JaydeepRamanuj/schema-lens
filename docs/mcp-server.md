# dbctx MCP Server

`dbctx` exposes its full schema-query surface as an MCP server over the standard
**stdio** transport. Any MCP-compatible agent (Anthropic Claude, Cursor, Copilot,
Antigravity, etc.) can register it and immediately start querying your PostgreSQL
schema without writing a single line of SQL.

---

## Quick Start

### 1. Build the project (first time only)
```bash
npm run build
```

### 2. Register the server with your agent

Add the following to your agent's MCP configuration file. Common locations:

| Agent/Editor | Config file |
|---|---|
| Claude Desktop (macOS) | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Claude Desktop (Windows) | `%APPDATA%\Claude\claude_desktop_config.json` |
| Cursor | `.cursor/mcp.json` (workspace) or `~/.cursor/mcp.json` (global) |
| Antigravity / Gemini IDE | Agent settings → MCP Servers |

#### Using `npx` (recommended — no clone required)

```json
{
  "mcpServers": {
    "dbctx": {
      "command": "npx",
      "args": ["dbctx", "mcp-serve"],
      "env": {}
    }
  }
}
```

#### Using the default profile (from a local build)

```json
{
  "mcpServers": {
    "dbctx": {
      "command": "node",
      "args": ["/absolute/path/to/dbctx/dist/cli/index.js", "mcp-serve"],
      "env": {}
    }
  }
}
```

#### Using a named profile from `dbctx.config.json`

```json
{
  "mcpServers": {
    "dbctx-prod": {
      "command": "npx",
      "args": ["dbctx", "mcp-serve", "--name", "prod"]
    },
    "dbctx-staging": {
      "command": "npx",
      "args": ["dbctx", "mcp-serve", "--name", "staging"]
    }
  }
}
```

#### Using a direct connection URL (no config file)

```json
{
  "mcpServers": {
    "dbctx": {
      "command": "npx",
      "args": ["dbctx", "mcp-serve"],
      "env": {
        "DBCTX_URL": "postgresql://user:password@localhost:5432/mydb"
      }
    }
  }
}
```

> **Note:** Use `DBCTX_URL` as an environment variable in the `"env"` block
> instead of `--url` to avoid putting credentials in the config file.

> **Global cache:** Set `DBCTX_GLOBAL=1` in the `"env"` block to use the shared
> home-directory cache (`~/.dbctx/cache/`) instead of a project-local one.

---

## Available Tools

All tools return a JSON object with a `_meta` field containing:
- `verifiedAt` — ISO 8601 timestamp of the last schema snapshot
- `stale` — `true` if the DB was unreachable during the last check

| Tool | Description |
|---|---|
| `list_tables` | List all tables/views, with optional name filter |
| `describe_tables` | Full structural detail (columns, constraints, indexes, FKs, policies, triggers) for one or more tables |
| `get_columns` | All columns for a single table |
| `get_column_constraints` | Constraints touching specific columns |
| `get_related_tables` | FK neighbors of a table (BFS, configurable depth) |
| `find_columns` | Find columns by name pattern across all tables |
| `find_common_columns` | Columns that exist in ALL of the given tables |
| `join_path` | Shortest FK path between two tables |
| `get_enums` | All PostgreSQL enum types and their values |
| `get_policies` | Row-Level Security policies |
| `search_schema` | Full-text search across names, comments, and enum values |
| `find_by_type` | Find all columns of a given data type (e.g. `jsonb`, `uuid`) |
| `find_polymorphic` | Scan for polymorphic association patterns (`*_type` + `*_id`) |
| `check_index` | Check if a covering index exists for a set of columns |
| `find_orphans` | Find tables with no FK relationships |
| `get_status` | Snapshot age, DB reachability, table count |

### Multi-database support

Every tool accepts an optional `connection_name` argument that selects a named
profile from `dbctx.config.json`. This allows a single running server to serve
queries across multiple databases:

```
list_tables(connection_name="staging")
describe(tables=["orders"], connection_name="prod")
```

---

## Snapshot Freshness

The server re-uses the same on-disk cache as the CLI. On each tool call it:
1. Reads the stored fingerprint.
2. Checks the DB for structural changes (lightweight, uses `pg_stat_user_tables`).
3. Re-extracts the full schema only when a change is detected.

If the database is unreachable, it serves the stale cached snapshot and sets
`_meta.stale = true` in the response.

To force a fresh snapshot at any time, run the CLI separately:
```bash
dbctx refresh --name prod
```

---

## Running the server manually (testing)

```bash
# Uses the default profile from dbctx.config.json
node dist/cli/index.js mcp-serve

# Or via npm dev (tsx, no build needed)
npx tsx src/cli/index.ts mcp-serve --name myprofile
```

The server logs diagnostic output to **stderr** only. stdout is reserved for
the MCP JSON-RPC protocol.

---

## Environment Variables

| Variable | Description |
|---|---|
| `DBCTX_URL` | PostgreSQL connection URL (overrides config file and `--url` flag) |
| `DBCTX_CONFIG` | Path to a custom `dbctx.config.json` file |
| `DBCTX_GLOBAL` | Set to `1` to use the global cache (`~/.dbctx/cache/`) instead of a project-local one |
