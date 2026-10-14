# Commands

Every command inherits three **global options**:

| Flag | Description |
| --- | --- |
| `--url <postgres-url>` | Full connection URL; overrides config file and `DBCTX_URL` |
| `--name <profile>` | Named profile from `dbctx.config.json`; overrides the `default` key |
| `--format <format>` | Output format: `json`, `md`, or `compact` (see [Output Formats](./output-formats.md)) |
| `--global` | Forces writes to the global cache directory (`~/.dbctx/cache`) instead of the local project directory |

---

## init

```
dbctx init [--url <url>] [--name <profile>] [--format <format>]
```

Connects to the database, runs a full schema extraction, and writes the snapshot to `.schema-cache/`. **Run this once** per project before using any other command.

**What it does:**

1. Resolves the connection URL (flag → env → config profile)
2. Connects to PostgreSQL
3. Runs 7 `pg_catalog` queries in a single `READ ONLY` transaction to extract tables, columns, constraints, indexes, triggers, policies, and enums
4. Writes `schema.json`, `fingerprint.json`, and `raw/extract-debug.json` under `.schema-cache/<connection-id>/`

**Output:**

```
Connecting to database...
✓ Snapshot created. 12 tables captured.
  Connection ID: a3f7c291be04d1e8
  Verified at: 2026-10-05T06:00:00.000Z
```

**When to use:**

- First-time setup for a new project
- After dropping and re-creating the database
- When you want to rebuild the cache from scratch

---

## refresh

```
dbctx refresh [--url <url>] [--name <profile>] [--format <format>] [--force]
```

Forces a fresh schema extraction from the database regardless of the current snapshot state.

| Flag | Description |
| --- | --- |
| `--force` | Skip the freshness check and always re-extract (default behavior of `refresh` is already to force) |

**Output:**

```
✓ Refreshed. 12 tables.
  Verified at: 2026-10-05T06:10:00.000Z
```

**When to use:**

- After running a database migration
- When the snapshot seems out of date
- In CI/CD pipelines before running agent tasks

---

## status

```
dbctx status [--url <url>] [--name <profile>] [--format <format>]
```

Shows the health and age of the local snapshot without modifying anything.

**Output fields:**

| Field | Description |
| --- | --- |
| `connectionId` | 16-char ID derived from host/port/dbname |
| `snapshotAge` | Human-readable age of the last verified snapshot (e.g. `"2m ago"`, `"1h ago"`) |
| `verifiedAt` | ISO 8601 timestamp of the last fingerprint verification |
| `dbReachable` | Whether the database responded to a `SELECT 1` ping |
| `tableCount` | Number of tables in the snapshot, or `null` if no snapshot exists |
| `stale` | `true` when a fingerprint exists but the DB is unreachable |

**Example compact output:**

```json
{
  "connectionId": "a3f7c291be04d1e8",
  "snapshotAge": "2m ago",
  "verifiedAt": "2026-10-05T06:00:00.000Z",
  "dbReachable": true,
  "tableCount": 12,
  "stale": false
}
--- [verified 2026-10-05T06:00:00.000Z]
```

---

## tables

```
dbctx tables [--url <url>] [--name <profile>] [--format <format>] [--filter <pattern>]
```

Lists all tables, views, and materialized views in the snapshot.

| Flag | Description |
| --- | --- |
| `--filter <pattern>` | Case-insensitive substring or regex applied to the fully-qualified table name (`schema.tablename`) |

**compact output:**

```
public.order_items (table)
public.orders (table)  -- Customer orders
public.products (table)  -- Product catalog
public.users (table)  -- Application users
--- [verified 2026-10-05T06:00:00.000Z]
```

**md output:**

```markdown
| Table | Type | Comment |
| --- | --- | --- |
| public.order_items | table |  |
| public.orders | table | Customer orders |
| public.products | table | Product catalog |
| public.users | table | Application users |
--- [verified 2026-10-05T06:00:00.000Z]
```

**Filter examples:**

```bash
dbctx tables --filter order       # matches "public.orders", "public.order_items"
dbctx tables --filter "^public"   # regex: all tables in the public schema
dbctx tables --filter "_view$"    # regex: all views by naming convention
```

---

## describe

```
dbctx describe <table> [<table> ...] [--url <url>] [--name <profile>] [--format <format>] [--include <sections>]
```

Returns full detail for one or more tables in a single call.

**Arguments:**

| Argument | Description |
| --- | --- |
| `<table> ...` | One or more table names. Bare names default to the `public` schema. Use `schema.table` for other schemas. |

| Flag | Description |
| --- | --- |
| `--include <sections>` | Comma-separated list of sections to include. Omit to return all sections. |

**Available sections for `--include`:**

| Section | What it includes |
| --- | --- |
| `columns` | Column name, type, nullability, default, and comment |
| `constraints` | PRIMARY KEY, FOREIGN KEY, UNIQUE, and CHECK constraints |
| `indexes` | Non-PK indexes with column list and uniqueness flag |
| `fks` | Shorthand for foreign key constraints only (subset of `constraints`) |
| `policies` | Row-level security policies |
| `triggers` | Trigger definitions |

> **Note:** `fks` and `constraints` can both be specified. If only `fks` is given, only `FOREIGN KEY` constraints are returned.

**Examples:**

```bash
# Full detail for a single table
dbctx describe users

# Multiple tables at once
dbctx describe users orders order_items

# Only columns and FK constraints
dbctx describe orders --include columns,fks

# Fully-qualified table name (non-public schema)
dbctx describe analytics.events

# Markdown output for documentation
dbctx describe users --format md
```

**compact output:**

```
public.users (table)
  -- Application users
  id uuid PK not null default gen_random_uuid()
  email text UNIQUE not null
  created_at timestamp with time zone not null default now()
  [INDEX users_email_idx (email) UNIQUE]
--- [verified 2026-10-05T06:00:00.000Z]
```

**md output:**

```markdown
## public.users (table)
*Application users*

### Columns
| Name | Type | Nullable | Default | Comment |
| --- | --- | --- | --- | --- |
| id | uuid | no | gen_random_uuid() |  |
| email | text | no |  | User email address |
| created_at | timestamp with time zone | no | now() |  |

### Constraints
| Name | Type | Columns | References | On Delete |
| --- | --- | --- | --- | --- |
| users_pkey | PRIMARY KEY | id |  |  |
| users_email_key | UNIQUE | email |  |  |

### Indexes
| Name | Columns | Unique |
| --- | --- | --- |
| users_email_idx | email | yes |
```

---

## columns

```
dbctx columns <table> [--url <url>] [--name <profile>] [--format <format>]
```

Lists columns for a single table. This is a focused shortcut — use `describe` when you also need constraints or indexes.

**compact output:**

```
  id uuid not null default gen_random_uuid()
  email text not null
  created_at timestamp with time zone not null default now()
--- [verified 2026-10-05T06:00:00.000Z]
```

Each line format: `  <name> <type>[not null][default <expr>]`

---

## constraints

```
dbctx constraints <table> [--url <url>] [--name <profile>] [--format <format>] [--columns <cols>]
```

Shows constraints for a table, optionally filtered to columns of interest.

| Flag | Description |
| --- | --- |
| `--columns <cols>` | Comma-separated column names. Only constraints touching at least one of these columns are returned. |

**Examples:**

```bash
# All constraints on the orders table
dbctx constraints orders

# Only constraints that touch user_id or status
dbctx constraints orders --columns user_id,status
```

**Use case:** An agent about to write an `INSERT` can ask which constraints apply to the columns it plans to set.

---

## related

```
dbctx related <table> [--url <url>] [--name <profile>] [--format <format>] [--depth <n>]
```

Traverses the FK graph from the given table in **both directions** (outgoing FKs and incoming FKs) up to the specified depth.

| Flag | Default | Description |
| --- | --- | --- |
| `--depth <n>` | `1` | How many hops from the root table to traverse |

**compact output:**

```
public.orders (depth: 1)
  public.orders → public.users  via (user_id)
  public.order_items → public.orders  via (order_id)
--- [verified 2026-10-05T06:00:00.000Z]
```

**json output structure:**

```json
{
  "result": {
    "root": "public.orders",
    "depth": 1,
    "nodes": ["public.users", "public.order_items"],
    "edges": [
      { "from": "public.orders", "to": "public.users", "via": ["user_id"] },
      { "from": "public.order_items", "to": "public.orders", "via": ["order_id"] }
    ]
  }
}
```

**When to use:**

- Understanding the blast radius of a schema change
- Deciding which tables need to be joined for a query
- Verifying ON DELETE behavior before deleting a parent row

---

## find-column

```
dbctx find-column <pattern> [--url <url>] [--name <profile>] [--format <format>]
```

Searches all tables for columns whose name matches the given pattern. The pattern is treated as a regex (case-insensitive); if it is an invalid regex it falls back to a literal substring match.

**Examples:**

```bash
dbctx find-column user_id        # finds all user_id columns
dbctx find-column "_at$"         # all timestamp-like columns (by convention)
dbctx find-column "^(created|updated)_at$"  # regex
```

**compact output:**

```
public.orders.user_id  (uuid)
public.profiles.user_id  (uuid)
--- [verified 2026-10-05T06:00:00.000Z]
```

**json output structure:**

```json
{
  "result": {
    "pattern": "user_id",
    "matches": [
      {
        "table": "public.orders",
        "column": { "name": "user_id", "type": "uuid", "nullable": false, "default": null, "comment": "Owner of the order" }
      }
    ]
  }
}
```

---

## join-path

```
dbctx join-path <from> <to> [--url <url>] [--name <profile>] [--format <format>]
```

Finds the **shortest FK path** between two tables using BFS over the relations graph. Traversal is bidirectional (both outgoing and incoming FKs are considered).

**compact output (path found):**

```
public.users → public.orders → public.order_items
  public.orders → public.users  via (user_id)
  public.order_items → public.orders  via (order_id)
--- [verified 2026-10-05T06:00:00.000Z]
```

**compact output (no path):**

```
No FK path found between public.users and public.products
--- [verified 2026-10-05T06:00:00.000Z]
```

**json output structure:**

```json
{
  "result": {
    "from": "public.users",
    "to": "public.order_items",
    "path": ["public.users", "public.orders", "public.order_items"],
    "edges": [
      { "from": "public.orders", "to": "public.users", "via": ["user_id"] },
      { "from": "public.order_items", "to": "public.orders", "via": ["order_id"] }
    ]
  }
}
```

**When `path` is `null`:** There is no FK chain connecting the two tables. They might still be joined via a shared column, but that relationship is not encoded in constraints.

---

## enums

```
dbctx enums [name] [--url <url>] [--name <profile>] [--format <format>]
```

Lists all PostgreSQL `ENUM` types captured in the snapshot.

**Arguments:**

| Argument | Description |
| --- | --- |
| `[name]` | Optional. Filter by enum name. Matches exact name, `schema.name`, or case-insensitive substring. |

**compact output (all enums):**

```
public.order_status: pending, paid, shipped, cancelled
--- [verified 2026-10-05T06:00:00.000Z]
```

**compact output (no enums):**

```
(no enums)
--- [verified 2026-10-05T06:00:00.000Z]
```

**json output structure:**

```json
{
  "result": {
    "enums": {
      "public.order_status": {
        "schema": "public",
        "values": ["pending", "paid", "shipped", "cancelled"]
      }
    }
  }
}
```

---

## policies

```
dbctx policies [table] [--url <url>] [--name <profile>] [--format <format>]
```

Shows Row-Level Security (RLS) policies captured in the snapshot.

**Arguments:**

| Argument | Description |
| --- | --- |
| `[table]` | Optional. If given, only policies on this table are returned. Bare name defaults to `public` schema. |

**compact output:**

```
public.orders: orders_user_policy (SELECT, permissive)
--- [verified 2026-10-05T06:00:00.000Z]
```

**compact output (no policies):**

```
(no RLS policies)
--- [verified 2026-10-05T06:00:00.000Z]
```

**json output structure:**

```json
{
  "result": {
    "policies": [
      {
        "table": "public.orders",
        "policy": {
          "name": "orders_user_policy",
          "permissive": true,
          "roles": ["authenticated"],
          "cmd": "SELECT",
          "qual": "(user_id = auth.uid())",
          "withCheck": null
        }
      }
    ]
  }
}
```

**Policy fields:**

| Field | Description |
| --- | --- |
| `name` | Policy name |
| `permissive` | `true` = PERMISSIVE, `false` = RESTRICTIVE |
| `roles` | Database roles this policy applies to |
| `cmd` | Command: `ALL`, `SELECT`, `INSERT`, `UPDATE`, or `DELETE` |
| `qual` | `USING` expression (row filter for reads) |
| `withCheck` | `WITH CHECK` expression (row filter for writes) |

---

## Error handling

All commands exit with code `1` on error and print a message to `stderr`:

```
Error: Table "nonexistent" not found in schema snapshot.
Tip: run 'dbctx tables' to see available tables.
```

Common errors:

| Message | Cause |
| --- | --- |
| `No profile "..." found` | `--name` references a profile not in the config file |
| `Database is unreachable and no cached snapshot exists` | DB down + no prior `init` |
| `Another dbctx process (PID ...) is refreshing this schema` | Concurrent refresh; wait or delete the `.lock` file |
| `Table "..." not found in schema snapshot` | Table name typo, or snapshot is stale |
| `Failed to parse dbctx.config.json` | JSON syntax error in the config file |
| `Invalid dbctx.config.json` | Config validates against the schema but a field has the wrong type |
