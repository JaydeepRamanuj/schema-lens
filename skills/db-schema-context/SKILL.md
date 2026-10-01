---
name: db-schema-context
description: >
  Use whenever writing or changing code that touches the database
  (queries, API endpoints, validation, migrations, types). Provides accurate,
  current table, column, constraint and relation info from a local snapshot
  verified against the live DB on every call.
  Do not guess schema details; look them up with this tool first.
---

# Database schema context (`dbctx`)

Use the `dbctx` CLI to look up the real PostgreSQL schema before writing any
database-related code. The data comes from a local snapshot that is verified
against the live database on every call — so it is always current.

## Workflow

1. **Find relevant tables**
   ```
   dbctx tables --filter <keyword>
   dbctx find-column <column-name>
   ```

2. **Get full detail for all tables you need in ONE call**
   ```
   dbctx describe <table1> <table2> ... --format compact
   ```

3. **Explore relationships**
   ```
   dbctx related <table> --depth 2
   dbctx join-path <from-table> <to-table>
   ```

4. **Check validation rules**
   ```
   dbctx constraints <table> --columns col1,col2
   ```

5. **When in doubt about freshness**
   ```
   dbctx status
   ```

## Rules

- Prefer **one batched call** over several single-table calls.
- **Never invent** column names, types, or constraints. Look them up.
- If the response shows `stale: true`, tell the user the DB was unreachable
  and the data may be out of date.
- Do not ask for or use database credentials. The tool handles the connection.
- Use `--format compact` unless you need full JSON detail.
- If a table is not found, run `dbctx tables` first — the name may be
  schema-qualified (e.g. `public.orders` not just `orders`).

## Output format

`compact` (default) — one line per column with type, PK/FK/constraints:
```
public.orders (table)
  id uuid PK not null default gen_random_uuid()
  user_id uuid not null → public.users.id (ON DELETE CASCADE)
  status order_status not null default 'pending'
  total numeric(10,2) not null CHECK (total >= 0)
--- [verified 2026-10-01T14:00:00Z | refreshed: false | stale: false]
```

`json` — full structured JSON with all fields.
`md` — Markdown tables, useful for documentation.

## All commands

```
dbctx init     --url <url> [--name <id>]           # first-time setup
dbctx refresh  [--name <id>] [--force]             # force re-extract
dbctx status   [--name <id>]                       # snapshot health
dbctx tables   [--filter <pattern>]                # list tables
dbctx describe <table...> [--include ...]          # full table detail
dbctx columns  <table>                             # column names + types
dbctx constraints <table> [--columns col1,col2]    # constraint detail
dbctx related  <table> [--depth 2]                 # FK neighbors
dbctx find-column <pattern>                        # where does a col appear
dbctx join-path <from> <to>                        # shortest FK path
dbctx enums    [<name>]                            # enum types + values
dbctx policies [<table>]                           # RLS policies
```
