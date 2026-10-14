# schema-lens

**Local PostgreSQL schema snapshot for coding agents, with a CLI and MCP server. Detects schema changes and works offline.**

`schema-lens` keeps a snapshot of your PostgreSQL schema on disk and answers schema questions from it: tables, columns, constraints, indexes, foreign-key paths, enums and RLS policies. Your coding agent looks these up through a CLI or an MCP server instead of guessing or writing its own catalog queries.

---

## Why

| Without `schema-lens` | With `schema-lens` |
|---|---|
| Agent guesses column names | Agent looks them up |
| Agent writes its own catalog queries | One tool call, answered from the snapshot |
| Stale schema if someone ran a migration | Structural changes detected on the next query ([how](#how-freshness-works)) |
| Works only when DB is reachable | Serves stale-flagged cache when DB is down |

---

## Installation

```bash
# Global CLI (recommended)
npm install -g @jaydeepramanuj/schema-lens

# One-off / no install
npx -y @jaydeepramanuj/schema-lens <command>
```

Requires **Node.js ≥ 18**.

The npm package is **`@jaydeepramanuj/schema-lens`**. It installs a command called **`dbctx`**, and its MCP server registers as **`dbctx`**. An unrelated npm package named `dbctx` exists; don't install that one.

---

## Quick Start

```bash
# 1. Connect and take the first snapshot
dbctx init --url postgres://user:pass@localhost:5432/mydb

# 2. Browse tables
dbctx tables

# 3. Inspect tables in one call
dbctx describe users orders --format compact

# 4. Explore relationships
dbctx related orders --depth 2

# 5. Check freshness
dbctx status
```

The snapshot is stored in `.schema-cache/` in your current directory. `dbctx` only connects to your own database; nothing is sent anywhere else.

---

## MCP Server

Register `dbctx` as an MCP server so your AI agent can call it directly as a tool.

Add it to your MCP client's config. Putting the URL in `env` keeps the credentials out of the agent's view:

```json
{
  "mcpServers": {
    "dbctx": {
      "command": "npx",
      "args": ["-y", "@jaydeepramanuj/schema-lens", "mcp-serve"],
      "env": {
        "DBCTX_URL": "postgres://user:pass@localhost:5432/mydb"
      }
    }
  }
}
```

With a named profile from `dbctx.config.json`:

```json
{
  "mcpServers": {
    "dbctx": {
      "command": "npx",
      "args": ["-y", "@jaydeepramanuj/schema-lens", "mcp-serve", "--name", "myapp-dev"]
    }
  }
}
```

See [docs/mcp-server.md](https://github.com/JaydeepRamanuj/schema-lens/blob/main/docs/mcp-server.md) for the full tool reference and multi-database setup.

---

## Configuration

Create `dbctx.config.json` in your project root:

```json
{
  "default": "myapp-dev",
  "ttlSeconds": 5,
  "defaultFormat": "compact",
  "profiles": {
    "myapp-dev": {
      "url": "postgres://user:pass@localhost:5432/myapp",
      "schemas": ["public"],
      "comment": "Local dev database"
    }
  }
}
```

The file contains database credentials, so keep it out of version control (add it to `.gitignore`).

See [docs/configuration.md](https://github.com/JaydeepRamanuj/schema-lens/blob/main/docs/configuration.md) for all options.

---

## Commands

| Command | Description |
|---|---|
| `init` | Connect and take the first schema snapshot |
| `refresh [--force]` | Re-extract if the schema changed; `--force` always re-extracts (use after a migration) |
| `status` | Snapshot age, table count, DB reachability, stale flag |
| `tables [--filter]` | List all tables and views |
| `describe <tables...>` | Columns, constraints, indexes and FKs (policies and triggers with `--format json`) |
| `columns <table>` | Column list for a single table |
| `constraints <table>` | PK / FK / unique / check constraints |
| `related <table>` | FK neighbors (BFS graph, `--depth`) |
| `find-column <pattern>` | Find columns by name pattern across all tables |
| `find-common-columns <tables...>` | Columns shared by a set of tables |
| `join-path <from> <to>` | Shortest FK path between two tables |
| `enums [name]` | PostgreSQL enum types and their values |
| `policies [table]` | Row-Level Security policies |
| `search-schema <keyword>` | Global search: table/column names, comments, enums |
| `find-by-type <type>` | All columns of a given data type (e.g. `uuid`, `jsonb`) |
| `find-polymorphic` | Scan for polymorphic patterns (`*_type` + `*_id`) |
| `check-index <table> <cols...>` | Check if a covering index exists |
| `find-orphans` | Tables with no FK relationships |
| `docs <command>` | Detailed help for any command |
| `mcp-serve` | Start the MCP stdio server |

**Global options** (all commands): `--url`, `--name`, `--format json|md|compact`, `--global`

See [docs/commands.md](https://github.com/JaydeepRamanuj/schema-lens/blob/main/docs/commands.md) for the full reference.

---

## Output Formats

```bash
dbctx describe orders --format compact   # token-efficient (default)
dbctx describe orders --format json      # full structured JSON
dbctx describe orders --format md        # human-readable markdown
```

For `describe`, `compact` leaves out policies and triggers, and `md` leaves out triggers. Use `json` when you need everything.

---

## How Freshness Works

Before answering, `dbctx` compares a fingerprint of the catalog (columns, constraints, indexes and enums) with the one stored alongside the snapshot. It does this at most once per `ttlSeconds` (default 5 s). If the fingerprint changed, it re-extracts the schema before answering.

Changes to comments, RLS policies, triggers and view definitions are not part of the fingerprint. After changing those, run `dbctx refresh --force`.

If the database is unreachable, it serves the cached snapshot and marks the response `stale: true`.

See [docs/snapshot-freshness.md](https://github.com/JaydeepRamanuj/schema-lens/blob/main/docs/snapshot-freshness.md) for details.

---

## Programmatic API

```typescript
import { deriveConnectionId, readSchema, listTables } from "@jaydeepramanuj/schema-lens";

// Reads the snapshot that `dbctx init` wrote to ./.schema-cache
const schema = await readSchema(deriveConnectionId(process.env.DATABASE_URL!));
if (schema) {
  const result = listTables(schema, "order");
}
```

See [`src/core/index.ts`](https://github.com/JaydeepRamanuj/schema-lens/blob/main/src/core/index.ts) for the full exported surface.

---

## Links

- [Getting Started](https://github.com/JaydeepRamanuj/schema-lens/blob/main/docs/getting-started.md)
- [Configuration](https://github.com/JaydeepRamanuj/schema-lens/blob/main/docs/configuration.md)
- [Commands Reference](https://github.com/JaydeepRamanuj/schema-lens/blob/main/docs/commands.md)
- [Output Formats](https://github.com/JaydeepRamanuj/schema-lens/blob/main/docs/output-formats.md)
- [MCP Server](https://github.com/JaydeepRamanuj/schema-lens/blob/main/docs/mcp-server.md)
- [Schema Data Model](https://github.com/JaydeepRamanuj/schema-lens/blob/main/docs/schema-data-model.md)
- [Snapshot Freshness](https://github.com/JaydeepRamanuj/schema-lens/blob/main/docs/snapshot-freshness.md)
- [Changelog](./CHANGELOG.md)

---

## License

[MIT](./LICENSE)
