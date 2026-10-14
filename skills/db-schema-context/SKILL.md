---
name: db-schema-context
description: >
  Use whenever writing or changing code that touches the database
  (queries, API endpoints, validation, migrations, types). Provides accurate,
  current table, column, constraint and relation info via MCP tools backed
  by a local snapshot that is checked against the live database for changes
  (at most every few seconds).
  Do not guess schema details; look them up with these tools first.
---

# Database Schema Context (`dbctx` MCP Server)

Use the `dbctx` MCP tools to look up the real PostgreSQL schema before writing
any database-related code. The data comes from a local snapshot. Before
answering, the server checks the live database for structural changes (at most
once per `ttlSeconds`, default 5 s) and re-extracts the snapshot if columns,
constraints, indexes or enums changed. Comments, RLS policies, triggers and view
definitions are not part of that check. See [Snapshot freshness](https://github.com/JaydeepRamanuj/schema-lens/blob/main/docs/snapshot-freshness.md).

Tools are provided by the MCP server named `dbctx`. Your client may prefix the
names (e.g. `mcp__dbctx__describe_tables`). Examples below show the tool name
followed by its arguments.

---

## Tool Documentation

Each tool's description and input schema are available from your MCP client's
tool list. If you are unsure how to call a tool, check its input schema there.

---

## Workflow

### 1. Discover — find the right tables

Use **one** of these depending on what you know:

| What you know | Tool | Key arguments |
|---|---|---|
| A keyword or concept (e.g. "auth") | `search_schema` | `keyword` — searches table names, column names, comments, enum names/values |
| A partial table name | `list_tables` | `filter` — substring or regex against table names |
| A column name pattern | `find_columns` | `pattern` — finds every table containing a matching column |

**Example** — find everything related to "document":
```
search_schema {"keyword": "document"}
```

### 2. Inspect — get full structural detail

Once you know the table names, use **`describe_tables`** to get columns, constraints,
indexes, foreign keys, policies, and triggers.

> **Batch-first rule**: `describe_tables` accepts a `tables` array. Always pass
> **all** the tables you need in a single call instead of making one call per
> table.

```
describe_tables {"tables": ["users", "documents", "document_versions"]}
```

**Use `include` to limit the response** when you only need specific sections.
Valid sections: `columns`, `constraints`, `indexes`, `fks`, `policies`, `triggers`.

```
describe_tables {"tables": ["users", "documents"], "include": ["columns", "fks"]}
```

This keeps the response payload small when you don't need full detail.

For a quick column-only lookup on a single table, `get_columns` is a lighter
alternative:
```
get_columns {"table": "users"}
```

### 3. Explore relationships

| Goal | Tool | Key arguments |
|---|---|---|
| FK neighbours of a table (BFS) | `get_related_tables` | `table`, `depth` (1–5, default 1) |
| Shortest FK path between two tables | `join_path` | `from`, `to` |
| Columns shared across N tables (for JOINs) | `find_common_columns` | `tables` (array, min 2), optional `pattern` |

```
get_related_tables {"table": "documents", "depth": 2}
```
```
join_path {"from": "users", "to": "comments"}
```
```
find_common_columns {"tables": ["users", "posts"]}
```

### 4. Check validation & constraints

```
get_column_constraints {"table": "users", "columns": ["email", "id"]}
```

Returns PK, FK, UNIQUE, and CHECK constraints that touch the specified columns.

### 5. Enum values

```
get_enums {}
```

Pass `name` to filter: `{ "name": "user_role" }`.

### 6. RLS policies

```
get_policies {"table": "documents"}
```

Omit `table` to get all policies across every table.

### 7. Schema analysis tools

| Tool | Purpose |
|---|---|
| `find_by_type` | Find all columns of a specific PostgreSQL type (e.g. `uuid`, `jsonb`) |
| `find_polymorphic` | Detect polymorphic association patterns (`item_type` + `item_id` pairs) |
| `find_orphans` | Tables with zero FK relationships (isolated from the rest of the schema) |
| `check_index` | Check whether a covering index exists for a set of columns on a table |

```
check_index {"table": "posts", "columns": ["author_id", "created_at"]}
```

### 8. Freshness check

```
get_status {}
```

Returns snapshot age, table count, DB reachability, and staleness flag.

---

## Efficiency Rules

1. **Batch aggressively.** `describe_tables` accepts multiple tables — always pass
   all the tables you need in one call. Never loop one table at a time.
2. **Use `include` to scope responses.** If you only need columns and foreign
   keys, pass `"include": ["columns", "fks"]`. Omitting unneeded sections
   reduces response size and makes the output easier to parse.
3. **Start broad, then narrow.** Use `search_schema` or `list_tables` first
   to discover relevant tables, then `describe_tables` to get full detail for just
   those tables.
4. **Prefer `get_columns` for lightweight lookups.** When you only need column
   names and types for a single table, `get_columns` is cheaper than a full
   `describe_tables`.
5. **Use `find_common_columns` before writing JOINs.** It tells you which
   columns are shared across tables, so you don't have to manually cross-
   reference multiple `describe_tables` outputs.
6. **Check indexes before adding them.** Use `check_index` to see if a
   covering index already exists before proposing a new migration.

---

## Output Format

All MCP tools return structured JSON. Every tool except `get_status` includes a
`_meta` block:

```json
{
  "_meta": {
    "verifiedAt": "2026-10-01T14:00:00Z",
    "stale": false
  }
}
```

- `verifiedAt` — when the snapshot was last verified against the live DB.
- `stale` — `true` means the DB was unreachable and the data may be outdated.

---

## Rules

- **Never invent** column names, types, or constraints. Look them up.
- If the response shows `"stale": true`, warn the user that the DB was
  unreachable and the data may be out of date.
- Do not ask for or use database credentials. The tool handles connections.
- Bare table names resolve to the `public` schema. For tables in other schemas,
  use `schema.table` (e.g. `analytics.page_views`).
- If a table is not found, run `list_tables` or `search_schema` to find its
  exact name.
- Use `connection_name` only if the project has multiple database profiles
  configured in `dbctx.config.json`. Omit it to use the default profile.

---

## All Available Tools (Quick Reference)

| Tool | Description |
|---|---|
| `list_tables` | List all tables/views; optional `filter` pattern |
| `describe_tables` | Full detail for one or more tables (batched); optional `include` filter |
| `get_columns` | Column names + types for a single table |
| `get_column_constraints` | PK/FK/UNIQUE/CHECK constraints for specific columns |
| `get_related_tables` | FK neighbours via BFS; configurable `depth` |
| `find_columns` | Search all tables for columns matching a pattern |
| `find_common_columns` | Columns shared across multiple tables |
| `join_path` | Shortest FK path between two tables |
| `get_enums` | Enum types and their allowed values |
| `get_policies` | Row-Level Security policies |
| `search_schema` | Full-text search across table names, columns, comments, enums |
| `find_by_type` | Find columns by PostgreSQL data type |
| `find_polymorphic` | Detect polymorphic association patterns |
| `find_orphans` | Tables with no FK relationships |
| `check_index` | Check for covering index on specific columns |
| `get_status` | Snapshot health — age, table count, reachability, staleness |
