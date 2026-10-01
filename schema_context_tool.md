# Schema Context Tool: Spec and Build Guide

A local, provider-agnostic PostgreSQL schema store that coding agents query through a CLI (and optionally MCP), guided by a skill. Extraction starts with `tbls`; a custom script is the fallback.

---

## 1. Problem

When an agent writes API or DB code, it needs to know the real tables, columns, types, constraints and relations. Without that it guesses, and the code is error-prone.

The current approach is an MCP server that introspects the live database on demand. It works, but it is slow in practice. The likely causes (to be confirmed in Phase 0):

| Suspected cause | Why it hurts |
|---|---|
| Many tool calls per task | Each call is a model round trip: list tables, describe table, fetch FKs, repeat |
| Verbose raw output | `information_schema` dumps cost tokens and reading time |
| Network latency | Every call reaches a remote DB |

Raw catalog queries themselves are cheap (milliseconds). So the fix is **fewer, batched calls returning compact output from a local source**, not just "make the query faster".

---

## 2. Goals and non-goals

### Goals
- Work with **any PostgreSQL database** (local or remote) given only a connection URL. No Supabase or other provider dependency.
- Be used in **everyday development**, not only around migrations.
- Serve schema answers from a **local JSON store** in milliseconds.
- Offer **batched query functions** so the agent gets complex answers in one call (e.g. constraints for 5 columns, all columns of a table, FK neighbors).
- **Never serve stale data**: freshness is verified on every read.
- Be explainable to an agent through a **skill** file.
- Start with `tbls` for extraction; keep the option of a custom extractor.

### Non-goals (for v1)
- Supporting databases other than PostgreSQL.
- Writing to the database or running migrations.
- A GUI.
- Replacing ORMs or type generators. This is context for agents, not a code generator.

---

## 3. Key design decisions and the reasoning

| Decision | Reasoning |
|---|---|
| **Local JSON store** | Reads are instant and offline-capable, the DB is not hit per question, and the file can be diffed and (if desired) committed |
| **Query layer on top of the JSON** | Joins and aggregation happen in deterministic code, not in the model's head. One call replaces many file reads, which means fewer tokens and fewer misreadings |
| **`tbls` for extraction (first)** | It already connects by DSN, supports Postgres, and emits JSON. This avoids writing and maintaining introspection SQL until we know it is insufficient |
| **Fingerprint check on read, not a poller** | A daemon is another thing to run and fail. A tiny read-only catalog query before each read makes staleness impossible by construction and installs nothing in the DB |
| **DDL event trigger is optional** | It needs elevated privileges and objects installed in each DB, which breaks the "just add a URL" goal. Keep it as a later optimization for very large schemas |
| **CLI first, MCP later** | The CLI is called via shell and documented by the skill. MCP tool definitions consume context in every conversation. Both front ends share one core library, so adding MCP later costs little |
| **Markdown rendered from JSON on demand** | A simple first-pass view for humans and simple tasks, without maintaining a second store |
| **Read-only DB credentials** | The tool only reads catalogs. Least privilege protects the database and limits what an agent can reach |

---

## 4. Architecture

```
                 +-----------------------------+
                 |  PostgreSQL (any, via URL)  |
                 +--------------+--------------+
                                |
            (1) fingerprint     |     (2) full/partial extraction
            query (cheap)       |     via tbls (or custom script)
                                |
   +----------------------------v-----------------------------+
   |                  Core library (TypeScript)               |
   |  - freshness check   - extractor adapter (tbls)          |
   |  - normalizer        - query functions                   |
   +-----------+------------------------------+---------------+
               |                              |
        +------v------+                +------v-------+
        |  CLI        |                |  MCP server  |
        |  (phase 4)  |                |  (optional)  |
        +------+------+                +------+-------+
               |                              |
               +--------------+---------------+
                              |
                    Agent + skill (SKILL.md)

 Local store:  .schema-cache/<connection-id>/
                 schema.json        (normalized snapshot)
                 fingerprint.json   (per-table hashes + timestamp)
                 raw/tbls.json      (raw extractor output, for debugging)
```

### Read flow (every query)
1. Resolve the connection (URL or named profile).
2. Run the **fingerprint query** (one small read-only query).
3. Compare per-table hashes with `fingerprint.json`.
   - **Match:** answer from `schema.json`.
   - **Mismatch / new / dropped tables:** re-extract (changed tables only, or the whole schema if simpler), normalize, write the store, update the fingerprint, then answer.
4. If the DB is unreachable: serve the cached snapshot and mark the response `stale: true, reason: "db unreachable"`.

---

## 5. Components

### 5.1 Extractor adapter (tbls)
- Calls the `tbls` binary (`tbls out` with JSON output) via a child process.
- Output is saved to `raw/tbls.json`.
- A **normalizer** converts it to our own stable schema (section 6), so the rest of the tool never depends on tbls's exact format. If we later swap `tbls` for a custom extractor, only this adapter changes.

### 5.2 Normalizer
- Flattens and renames tbls fields into our format.
- Normalizes table names (tbls may schema-qualify names; decide on a canonical `schema.table` form and accept bare names for `public`).
- Precomputes lookups: columns by table, FK graph (both directions), reverse references, enum values.

### 5.3 Freshness module
- Runs the fingerprint SQL (section 9).
- Stores per-table hashes, so a change identifies exactly which tables to refresh.
- Optional TTL (e.g. skip the check if verified within the last N seconds) to avoid a DB hit on rapid-fire calls.

### 5.4 Query functions (the agent-facing API)
All functions accept multiple tables or columns where it makes sense, and return compact JSON by default.

| Function | Purpose |
|---|---|
| `listTables(filter?)` | Table names, type (table/view), one-line comment |
| `describe(tables[], include?)` | Columns, constraints, indexes, FKs for several tables in one call. `include` selects sections |
| `getTableSchema(table)` | Full detail for one table |
| `getColumns(table)` | Just column names and types |
| `getColumnConstraints(table, columns[])` | PK/FK/unique/check/not-null/default for several columns at once |
| `related(table, depth?)` | FK neighbors in both directions up to a depth |
| `findColumns(pattern)` | Where does a column name or pattern appear |
| `joinPath(from, to)` | Shortest FK path between two tables |
| `getEnums(name?)` | Enum types and values |
| `getPolicies(table?)` | RLS policies (if extraction covers them; see section 8) |
| `status()` | Snapshot age, DB reachability, fingerprint state |

Design rule: **one call should answer one realistic agent question.** If the agent routinely needs two calls for one question, add a function.

### 5.5 CLI
- Thin wrapper over the core functions. Output is JSON by default, `--format md` for readable markdown, `--format compact` for the smallest token footprint.
- See section 10 for the command reference.

### 5.6 MCP server (optional, later)
- Exposes the same functions as typed tools.
- Add only if the CLI proves awkward for your agent setup, because tool definitions cost context.

### 5.7 Skill
- A `SKILL.md` telling the agent when to use the tool, which commands exist, and in what order to use them (section 11).

---

## 6. Store format (normalized schema)

```jsonc
{
  "meta": {
    "connectionId": "myapp-dev",
    "dbName": "myapp",
    "generatedAt": "2026-10-01T10:00:00Z",
    "extractor": "tbls",
    "extractorVersion": "x.y.z",
    "snapshotVersion": 1
  },
  "tables": {
    "public.orders": {
      "type": "table",                 // table | view | materialized_view
      "comment": "Customer orders",
      "columns": [
        {
          "name": "id", "type": "uuid", "nullable": false,
          "default": "gen_random_uuid()", "comment": null
        },
        {
          "name": "user_id", "type": "uuid", "nullable": false,
          "default": null, "comment": "Owner of the order"
        }
      ],
      "constraints": [
        { "name": "orders_pkey", "type": "PRIMARY KEY", "columns": ["id"] },
        {
          "name": "orders_user_id_fkey", "type": "FOREIGN KEY",
          "columns": ["user_id"],
          "references": { "table": "public.users", "columns": ["id"] },
          "onDelete": "CASCADE"
        },
        { "name": "orders_total_check", "type": "CHECK", "def": "CHECK ((total >= 0))" }
      ],
      "indexes": [
        { "name": "orders_user_id_idx", "columns": ["user_id"], "unique": false, "def": "CREATE INDEX ..." }
      ],
      "triggers": [],
      "policies": []                   // filled if extraction supports it
    }
  },
  "relations": {
    "public.orders": {
      "references": ["public.users"],
      "referencedBy": ["public.order_items"]
    }
  },
  "enums": { "order_status": ["pending", "paid", "shipped", "cancelled"] }
}
```

Store location: `.schema-cache/<connection-id>/`. Decide whether to **git-commit** `schema.json` (reviewable schema diffs, shared across the team) or **gitignore** it (per-developer). Recommended: commit for dev databases, ignore for anything else.

---

## 7. Build plan (step by step)

### Phase 0: Profile the current setup (about 30 minutes)
Goal: confirm *why* the current MCP flow is slow, so the new tool addresses the real cause.
1. Time a typical agent task end to end with the existing MCP server.
2. Count tool calls and measure the size of each response.
3. Run the underlying catalog queries directly (psql) and time them.
4. Record the baseline: total time, number of calls, total tokens of schema output.

**Exit criteria:** you know whether the cost is call count, output size, or network latency.

### Phase 1: `tbls` spike and gap analysis (about 1 to 2 hours)
Goal: decide whether `tbls` is the extraction layer or only inspiration.
1. Install `tbls` (section 12).
2. Run it against a real dev database and dump JSON.
3. Inspect the JSON against the checklist below.

**Gap-analysis checklist** (mark each Yes / Partial / No):
- [ ] Tables and views (and materialized views)
- [ ] Column name, type, nullability, default
- [ ] Column and table comments
- [ ] Primary keys
- [ ] Foreign keys (with referenced table and columns, ON DELETE / ON UPDATE)
- [ ] Unique constraints
- [ ] Check constraints (full definition)
- [ ] Indexes (columns, uniqueness, definition)
- [ ] Triggers
- [ ] Enum types and values
- [ ] RLS policies
- [ ] Non-`public` schemas handled correctly
- [ ] Table naming convention (schema-qualified or not)
- [ ] Runtime on your biggest database

**Decision rule:**
- Mostly Yes, with gaps only in policies or enums: use `tbls` plus a small supplemental query (section 8).
- Several important No's, or awkward output: write a custom extractor (section 14).

### Phase 2: Store and normalizer (about half a day)
1. Scaffold the TypeScript project (section 13).
2. Implement the `tbls` adapter: spawn the binary, capture JSON, save to `raw/`.
3. Write the normalizer into the schema in section 6.
4. Add the supplemental queries for any gaps found in Phase 1.
5. Unit-test the normalizer against saved fixture files.

**Exit criteria:** `refresh` produces a valid `schema.json` from a real DB.

### Phase 3: Freshness check (about half a day)
1. Implement the fingerprint query (section 9).
2. Store per-table hashes with the snapshot.
3. Implement the read flow from section 4, including the DB-unreachable fallback.
4. Test by running DDL (add a column, add an index, add a constraint, drop a table) and confirming each is detected and refreshed.

**Exit criteria:** every kind of schema change is detected on the next read, and unchanged schemas never re-extract.

### Phase 4: Query functions and CLI (about 1 day)
1. Implement the functions in section 5.4 over the normalized store.
2. Wrap them in the CLI (section 10).
3. Add `--format json|md|compact`.
4. Measure: one batched call versus the old multi-call flow.

**Exit criteria:** common agent questions are answered in one CLI call, in milliseconds.

### Phase 5: Skill (about 1 to 2 hours)
1. Write `SKILL.md` (section 11).
2. Test with the real agent on real tasks. Watch which commands it calls and which questions need more than one call.
3. Add or reshape functions based on what you see.

### Phase 6: MCP server (optional)
Wrap the same functions as MCP tools only if needed.

### Phase 7: Optional DDL event trigger
Add only if the fingerprint query becomes noticeable on very large schemas. It must be opt-in and must handle lack of privileges gracefully. See the caution in section 15.

### Phase 8: Hardening
- Multiple connection profiles.
- Timeouts and clear error messages.
- A lock file so two processes don't refresh the same store at once.
- Logging a refresh summary ("refreshed 2 tables: orders, order_items").
- Documentation for teammates.

---

## 8. Supplemental extraction (if `tbls` has gaps)

If the Phase 1 checklist shows gaps, fill them with small catalog queries run by our own code and merged during normalization.

**RLS policies**
```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
ORDER BY schemaname, tablename, policyname;
```

**Whether RLS is enabled per table**
```sql
SELECT n.nspname AS schema, c.relname AS table,
       c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS rls_forced
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind IN ('r', 'p');
```

**Enums**
```sql
SELECT n.nspname AS schema, t.typname AS name,
       array_agg(e.enumlabel ORDER BY e.enumsortorder) AS values
FROM pg_type t
JOIN pg_enum e ON e.enumtypid = t.oid
JOIN pg_namespace n ON n.oid = t.typnamespace
GROUP BY n.nspname, t.typname;
```

**Check constraints (full definitions)**
```sql
SELECT conrelid::regclass AS table, conname, pg_get_constraintdef(oid) AS def
FROM pg_constraint
WHERE contype = 'c';
```

These are reference drafts. Test them against your own database.

---

## 9. Freshness fingerprint query (draft)

Returns one hash per table covering columns, defaults, constraints and indexes. Compare with the stored hashes to find exactly which tables changed.

```sql
SELECT n.nspname AS schema,
       c.relname AS name,
       md5(
         coalesce((
           SELECT string_agg(
                    a.attnum || ':' || a.attname || ':' ||
                    format_type(a.atttypid, a.atttypmod) || ':' ||
                    a.attnotnull || ':' ||
                    coalesce(pg_get_expr(d.adbin, d.adrelid), ''),
                    ',' ORDER BY a.attnum)
           FROM pg_attribute a
           LEFT JOIN pg_attrdef d
                  ON d.adrelid = a.attrelid AND d.adnum = a.attnum
           WHERE a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
         ), '')
         || '|' ||
         coalesce((
           SELECT string_agg(co.conname || ':' || pg_get_constraintdef(co.oid),
                             ',' ORDER BY co.conname)
           FROM pg_constraint co WHERE co.conrelid = c.oid
         ), '')
         || '|' ||
         coalesce((
           SELECT string_agg(pg_get_indexdef(i.indexrelid),
                             ',' ORDER BY i.indexrelid::regclass::text)
           FROM pg_index i WHERE i.indrelid = c.oid
         ), '')
       ) AS fingerprint
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind IN ('r', 'p', 'v', 'm', 'f')
  AND n.nspname NOT IN ('pg_catalog', 'information_schema')
  AND n.nspname NOT LIKE 'pg_toast%'
ORDER BY 1, 2;
```

Notes:
- **Dropped tables** are detected because they're in the stored fingerprint but missing from the result. **New tables** are the reverse.
- Extend the hash to include `pg_trigger`, `pg_policy`, and `obj_description()` (comments) if those matter to your agent.
- Enum changes live in `pg_enum`. Add a separate small fingerprint for enums.
- Test the query's runtime on your largest database. If it is too slow, add a TTL or move to the event-trigger option.

---

## 10. CLI reference (proposed)

Binary name is a placeholder: `dbctx`.

```
dbctx init   --url <postgres-url> [--name myapp-dev]   # create a connection profile and first snapshot
dbctx refresh [--name <profile>] [--force]             # force re-extract
dbctx status  [--name <profile>]                       # snapshot age, fingerprint state, DB reachable?

dbctx tables  [--filter <pattern>]
dbctx describe <table...> [--include columns,constraints,indexes,fks] [--format json|md|compact]
dbctx columns <table>
dbctx constraints <table> [--columns col1,col2,...]
dbctx related <table> [--depth 2]
dbctx find-column <pattern>
dbctx join-path <from> <to>
dbctx enums [<name>]
dbctx policies [<table>]
```

**Connection resolution order:** `--url` flag, then `DBCTX_URL` env var, then the named profile in `.dbctxrc`. Keep credentials in env vars, not in committed files.

**Example (compact output)**
```
$ dbctx describe orders users --include columns,fks --format compact

orders (table)
  id uuid PK not null default gen_random_uuid()
  user_id uuid not null -> users.id (ON DELETE CASCADE)
  status order_status not null default 'pending'
  total numeric(10,2) not null CHECK (total >= 0)

users (table)
  id uuid PK not null
  email text not null UNIQUE
```

Every response should include freshness info (`verifiedAt`, `refreshed: true|false`, `stale: true|false`).

---

## 11. Skill draft (`SKILL.md`)

```markdown
---
name: db-schema-context
description: Use whenever writing or changing code that touches the database
  (queries, API endpoints, validation, migrations, types). Provides accurate,
  current table, column, constraint and relation info from a local snapshot.
  Do not guess schema details; look them up with this tool first.
---

# Database schema context

Use the `dbctx` CLI to look up the real schema before writing DB code.
The data comes from a local snapshot that is verified against the live DB on
every call, so it is always current.

## Workflow
1. Find relevant tables: `dbctx tables --filter <keyword>` or
   `dbctx find-column <name>`.
2. Get detail for ALL tables you need in ONE call:
   `dbctx describe <t1> <t2> ... --format compact`
3. For relationships: `dbctx related <table> --depth 2`
   or `dbctx join-path <from> <to>`.
4. For validation rules: `dbctx constraints <table> --columns a,b,c`.

## Rules
- Prefer one batched call over several single-table calls.
- Never invent column names, types or constraints. Look them up.
- If a response shows `stale: true`, tell the user the DB was unreachable and
  the data may be out of date.
- Do not ask for or use database credentials. The tool handles connection.
- Use `--format compact` unless you need full detail.
```

Tune this after watching the agent use it (Phase 5).

---

## 12. Setup and run guide

### 12.1 Prerequisites
- Node.js (current LTS) and a package manager.
- Network access to the target PostgreSQL database.
- A **read-only database role** (section 12.2).

### 12.2 Create a read-only database role
Run as an admin on the target database:

```sql
CREATE ROLE schema_reader LOGIN PASSWORD '<strong-password>';
GRANT CONNECT ON DATABASE <dbname> TO schema_reader;
-- Catalog metadata is readable by any role. USAGE on schemas is needed so
-- table-level details are visible for the schemas you care about:
GRANT USAGE ON SCHEMA public TO schema_reader;
-- Repeat USAGE for any other schema you want documented.
```

Notes:
- Catalog tables (`pg_catalog`) are readable by default. Some views, such as `information_schema`, only show objects the role has privileges on, so verify the output isn't missing tables. If it is, grant `SELECT` on those tables, or use a role that owns or can see them.
- This role does **not** need to read table data. Don't grant data access unless needed for this to work.
- Use this role only against **dev or non-production** databases.

### 12.3 Install `tbls`
Pick one (check the project's README for current instructions):
- Homebrew: `brew install k1LoW/tap/tbls`
- Go: `go install github.com/k1LoW/tbls@latest`
- Docker image from the project's GitHub registry
- Prebuilt binary from the project's GitHub releases page

Verify: `tbls --version`

### 12.4 Try it manually (Phase 1)
```bash
export DB_URL='postgres://schema_reader:<password>@<host>:5432/<dbname>?sslmode=require'

# Generate JSON schema output. Flags can differ by version; confirm with:
tbls out --help
tbls out "$DB_URL" -t json > tbls-raw.json

# Optional: generate per-table markdown docs to eyeball the coverage
tbls doc "$DB_URL" ./docs/schema
```

Open `tbls-raw.json` and walk through the checklist in Phase 1.

### 12.5 Optional `tbls` config (`.tbls.yml`)
Useful for filtering and adding comments or virtual relations (FKs that exist logically but not as constraints):

```yaml
dsn: ${DB_URL}
docPath: docs/schema
include:
  - "public.*"
exclude:
  - "public.migrations"
# Virtual relations help when the DB has no real FK constraints:
relations:
  - table: orders
    columns: [user_id]
    parentTable: users
    parentColumns: [id]
```

(Confirm key names against the `tbls` docs for your version.)

### 12.6 Scaffold the tool
Suggested stack: TypeScript, matching your existing stack.

```
dbctx/
  package.json
  tsconfig.json
  src/
    core/
      extractor/tbls.ts        # spawn tbls, parse JSON
      extractor/supplement.ts  # policies, enums, checks via pg
      normalize.ts
      store.ts                 # read/write .schema-cache
      freshness.ts             # fingerprint compare
      queries.ts               # describe, related, joinPath, ...
    cli/index.ts               # commander wrapper
    mcp/server.ts              # later, optional
  test/
    fixtures/                  # saved tbls JSON samples
```

Suggested dependencies: `pg` (fingerprint and supplemental queries), `commander` (CLI), `zod` (validate extractor output), `vitest` (tests).

### 12.7 Day-to-day use
```bash
dbctx init --url "$DB_URL" --name myapp-dev   # one time
dbctx describe orders users --format compact  # agent or you; auto-refreshes if needed
dbctx status                                   # when in doubt
dbctx refresh --force                          # manual escape hatch
```

Add the skill to your agent's skills location and confirm it can run `dbctx` from the project directory.

---

## 13. Testing and acceptance criteria

| Test | Expected result |
|---|---|
| Add column, then query | Next read reflects it; only that table re-extracted |
| Add/drop index or constraint | Detected via fingerprint |
| Drop table | Removed from snapshot |
| Create table | Appears in snapshot |
| No schema change | No re-extraction; read time is the fingerprint query plus local lookup |
| DB unreachable | Serves cached snapshot with `stale: true` |
| Batched `describe` of 5 tables | One call, one compact response |
| Large schema | Fingerprint and refresh times are acceptable (measure; set a target) |
| Non-`public` schema | Handled with correct naming |
| Agent task benchmark | Fewer calls, fewer tokens and less time than the Phase 0 baseline |

Success metric: the Phase 0 baseline task completes in **one or two tool calls** with a substantially smaller total time.

---

## 14. Fallback: custom extractor

If `tbls` falls short (Phase 1 decision), write `extractor/custom.ts` that runs a small set of `pg_catalog` queries (columns, constraints via `pg_get_constraintdef`, indexes via `pg_get_indexdef`, FKs via `pg_constraint`, enums, policies, triggers, comments) and emits our normalized schema directly.

Because the normalizer and everything above it depend only on our own format, **nothing else changes**. Only the adapter swaps. This is the reason for the adapter boundary in section 5.1.

---

## 15. Risks and cautions

- **Event triggers (if added later):** A buggy event trigger can block all DDL, including migrations. Keep the body tiny, wrap it in an exception handler, and know how to disable it. It also needs privileges and installation in each DB, so keep it opt-in.
- **Credentials:** Never put DB passwords in committed files or in the snapshot. Use env vars. Give the agent no direct credentials; the tool holds the connection.
- **Environments:** Point the tool at dev databases. Do not expose production schema or credentials to the agent unless you have decided that deliberately.
- **Snapshot contents:** Schema can reveal business details (table and column names, policies). Decide on commit versus ignore with that in mind.
- **`tbls` output changes between versions:** pin the version, validate output with a schema (zod), and keep fixtures in tests.
- **Fingerprint blind spots:** anything not included in the hash won't trigger a refresh. Review what the hash covers whenever you add features that read new kinds of schema info.
- **Concurrency:** two agents or processes refreshing at once can corrupt the store. Use a lock file and write atomically (write temp file, then rename).
- **Large result sizes:** keep default outputs compact. Add `--include` filters so the agent isn't flooded with every table.

---

## 16. Open questions to settle early

1. Does `tbls` JSON cover RLS policies, enums and full check definitions? (Phase 1 answers this.)
2. Which schemas should be included by default (`public` only, or more)?
3. Commit `schema.json` to git or ignore it?
4. How many databases or environments will one project need? (Affects profile design.)
5. What is the largest schema size we need to support, and what latency is acceptable?
6. Which agent runtimes must be supported (shell-based CLI access, MCP, both)?

---

## 17. Future ideas

- MCP front end sharing the same core.
- Optional DDL event trigger plus `LISTEN/NOTIFY` for push-based refresh.
- Schema diff command (`dbctx diff`) to summarize what changed since the last snapshot, useful in code review.
- Sample-value hints (opt-in, privacy-aware) for columns with low cardinality.
- Generate ORM or TypeScript type stubs from the snapshot.
- Support for more databases through other `tbls` drivers.