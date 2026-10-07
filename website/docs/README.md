# dbctx — Documentation

`dbctx` is a local PostgreSQL schema store designed for coding agents. It extracts your database schema, caches it locally, and exposes a set of focused query commands so agents and developers can inspect tables, columns, constraints, foreign key relationships, enums, and RLS policies without hitting the database on every call.

## Documentation Index

| Document | Description |
| --- | --- |
| [Getting Started](./getting-started.md) | Installation, setup, and your first snapshot |
| [Configuration](./configuration.md) | `dbctx.config.json` reference, environment variables |
| [Commands](./commands.md) | Full reference for every CLI command and its flags |
| [Output Formats](./output-formats.md) | `compact`, `md`, and `json` format reference with examples |
| [Snapshot & Freshness](./snapshot-freshness.md) | How the local cache works, TTL, fingerprinting, and staleness |
| [Schema Data Model](./schema-data-model.md) | TypeScript types behind the normalized snapshot |

## Quick Look

```bash
# One-time setup
npm install -g dbctx          # or: npx dbctx
dbctx init --url postgres://user:pass@localhost/mydb

# Day-to-day
dbctx tables                  # list all tables
dbctx describe users orders   # full detail for one or more tables
dbctx related orders          # FK neighbors of a table
dbctx join-path users order_items  # shortest FK path between two tables
dbctx find-column "user_id"   # find every table that has a user_id column
dbctx enums                   # list all custom enum types
dbctx policies                # list all RLS policies
dbctx status                  # snapshot age and DB reachability
```
