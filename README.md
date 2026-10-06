# schema-lens

**Local PostgreSQL schema store for coding agents — fast, offline-capable, always-fresh.**

`schema-lens` caches your database schema locally and serves accurate, structured answers in milliseconds. Instead of your AI agent firing multiple slow SQL introspection queries per task, it calls one fast local command and gets back exactly what it needs.

---

## Why

| Without `schema-lens` | With `schema-lens` |
|---|---|
| Agent guesses column names | Agent looks them up |
| 5–10 DB round-trips per task | 1 local cache read |
| Stale schema if someone ran a migration | Auto-detected via lightweight fingerprint |
| Works only when DB is reachable | Serves stale-flagged cache when DB is down |

---

## Installation

```bash
# Global CLI (recommended)
npm install -g dbctx

# One-off / no install
npx dbctx <command>
```

Requires **Node.js ≥ 18**.

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

The snapshot is stored in `.schema-cache/` in your current directory. Nothing is sent to a remote server.

---

## MCP Server

Register `dbctx` as an MCP server so your AI agent can call it directly as a tool.

Add to your agent's MCP config (Claude Desktop, Cursor, Antigravity, etc.):

```json
{
  "mcpServers": {
    "dbctx": {
      "command": "npx",
      "args": ["dbctx", "mcp-serve"]
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
      "args": ["dbctx", "mcp-serve", "--name", "myapp-dev"]
    }
  }
}
```

See [docs/mcp-server.md](./docs/mcp-server.md) for the full tool reference and multi-database setup.

---

## Configuration

Copy the example config and edit it:

```bash
cp dbctx.config.json.example dbctx.config.json
```

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

See [docs/configuration.md](./docs/configuration.md) for all options.

---

## Commands

| Command | Description |
|---|---|
| `init` | Connect and take the first schema snapshot |
| `refresh` | Force re-extract (after a migration) |
| `status` | Snapshot age, DB reachability, fingerprint state |
| `tables [--filter]` | List all tables and views |
| `describe <tables...>` | Full detail: columns, constraints, indexes, FKs, policies |
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

**Global options** (all commands): `--url`, `--name`, `--format json|md|compact`, `--global`

See [docs/commands.md](./docs/commands.md) for the full reference.

---

## Output Formats

```bash
dbctx describe orders --format compact   # token-efficient (default)
dbctx describe orders --format json      # full structured JSON
dbctx describe orders --format md        # human-readable markdown
```

---

## How Freshness Works

On every query, `dbctx` runs a lightweight fingerprint check against the live DB (one small read-only catalog query). If the schema hasn't changed, it serves the cache instantly. If it has changed, it re-extracts and updates the cache before answering — transparently.

If the database is unreachable, it serves the cached snapshot and marks the response `stale: true`.

See [docs/snapshot-freshness.md](./docs/snapshot-freshness.md) for details.

---

## Programmatic API

```typescript
import { listTables, describe, getColumns } from "dbctx";
import { readSchema } from "dbctx";

const schema = await readSchema(connectionId);
const result = listTables(schema, "order");
```

See [`src/core/index.ts`](./src/core/index.ts) for the full exported surface.

---

## Links

- [Getting Started](./docs/getting-started.md)
- [Configuration](./docs/configuration.md)
- [Commands Reference](./docs/commands.md)
- [Output Formats](./docs/output-formats.md)
- [MCP Server](./docs/mcp-server.md)
- [Schema Data Model](./docs/schema-data-model.md)
- [Snapshot Freshness](./docs/snapshot-freshness.md)
- [Changelog](./CHANGELOG.md)

---

## License

[MIT](./LICENSE)
