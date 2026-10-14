# Snapshot & Freshness

`dbctx` stores the PostgreSQL schema locally and uses a **fingerprint** to detect when it has changed, avoiding unnecessary full re-extractions.

---

## The local cache

All data is written to `.schema-cache/<connection-id>/` in the current working directory.

```
.schema-cache/
└── a3f7c291be04d1e8/          ← connection ID (MD5 of host:port/dbname)
    ├── schema.json            ← normalized snapshot (the main read source)
    ├── fingerprint.json       ← per-table MD5 hashes + verifiedAt timestamp
    ├── .lock                  ← PID lock file; present only during refresh
    └── raw/
        └── extract-debug.json ← raw pg_catalog output before normalization
```

- `schema.json` is what every query command reads from
- `fingerprint.json` is what the freshness check uses to detect changes
- `raw/extract-debug.json` is a debug aid to inspect what the extractor saw

---

## Read flow (per command invocation)

Every command that reads schema data follows this decision tree:

```
Command invoked
      │
      ▼
  No local snapshot?
      │ yes → full re-extract from DB → save → serve
      │ no
      ▼
  force=true?
      │ yes → full re-extract from DB → save → serve
      │ no
      ▼
  DB reachable?
      │ no  → serve stale cache (stale: true in footer)
      │ yes
      ▼
  verifiedAt within TTL?
      │ yes → serve cache immediately (no DB fingerprint query)
      │ no
      ▼
  Query live fingerprints from DB
      │
      ▼
  Fingerprints match stored?
      │ yes → update verifiedAt → serve cache
      │ no
      ▼
  Full re-extract → save → serve (refreshed: true in footer)
```

---

## TTL (Time-To-Live)

`ttlSeconds` (default: `5`) is a short-circuit: if the last fingerprint check happened less than `ttlSeconds` seconds ago, the DB fingerprint query is skipped entirely and the cache is served as-is.

This prevents hammering the DB when many commands run in quick succession (e.g. an agent running several `describe` calls back-to-back).

Set `ttlSeconds: 0` to always recheck, or a larger value (e.g. `60`) if schema changes are infrequent.

---

## Fingerprinting

The fingerprint is a per-table MD5 hash covering:

- **Columns:** `attnum`, name, type, `NOT NULL` flag, and default expression
- **Constraints:** constraint name and `pg_get_constraintdef()` output
- **Indexes:** `pg_get_indexdef()` output

A separate hash covers all enum types in the schema.

These hashes are computed by the database itself using the SQL in `freshness.ts` and compared against the stored `fingerprint.json`. If any table's hash changes, or if the enum hash changes, a full re-extraction is triggered.

**What triggers a refresh:**

- A column was added, dropped, or altered
- A constraint was added, dropped, or changed
- An index was added, dropped, or changed
- An enum value was added or dropped
- A new table or view was created
- A table or view was dropped

**What does NOT trigger a refresh:**

- Table comments (not included in the fingerprint)
- Trigger definitions
- RLS policy changes

> **Limitation:** triggers and policies are not fingerprinted. If you change a trigger or RLS policy, run `dbctx refresh` manually.

---

## Staleness

A snapshot is marked **stale** when:

- A fingerprint exists (the DB was reachable at some point in the past), AND
- The DB is currently unreachable

In this state, all commands serve the cached data with `stale: true` in the footer. No error is thrown — the tool is designed to be useful even when the DB is offline.

Example footer when stale:

```
--- [verified 2026-10-05T06:00:00.000Z | stale: true (db unreachable)]
```

---

## Atomic writes

All writes to `schema.json` and `fingerprint.json` use a write-then-rename pattern:

1. Write to `<file>.tmp`
2. `rename()` to `<file>`

This ensures a reader never sees a partially-written file.

---

## Concurrency lock

When a refresh is in progress, `dbctx` writes a `.lock` file containing the refreshing process's PID. If another `dbctx` process starts a refresh:

- It reads the `.lock` file
- It checks if the recorded PID is still alive via `process.kill(pid, 0)`
- If alive: throws `"Another dbctx process (PID ...) is refreshing this schema"`
- If not alive (crashed): removes the stale lock and proceeds

If a refresh crashes and leaves a stale lock, delete it manually:

```bash
rm .schema-cache/<connection-id>/.lock
```

---

## Forcing a refresh

```bash
dbctx refresh           # always re-extracts (refresh bypasses freshness check)
dbctx init              # same as refresh, but also prints the connection ID
```

Use `refresh` after running a database migration to ensure the snapshot is up to date before any agent work begins.

---

## Snapshot version

`schema.json` contains `"snapshotVersion": 1`. This field is reserved for future migrations of the snapshot format. Currently the only valid value is `1`.
