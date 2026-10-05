# Getting Started

## Prerequisites

- **Node.js** ≥ 18
- A running **PostgreSQL** database (v12 or later)

## Installation

### Global (recommended)

```bash
npm install -g dbctx
```

After installation, `dbctx` is available as a system-wide command.

### Local / npx

```bash
npx dbctx <command>
```

### From source

```bash
git clone <repo>
cd schema-context-tool
npm install
npm run build        # compiles TypeScript → dist/
```

Then either link globally:

```bash
npm link
```

Or call the built file directly:

```bash
node dist/cli/index.js <command>
```

During development you can skip the build step:

```bash
npm run dev -- <command>   # uses tsx to run src/cli/index.ts directly
```

---

## Your First Snapshot

### Option A — ad-hoc URL (no config file needed)

```bash
dbctx init --url postgres://user:password@localhost:5432/mydb
```

Output:

```
Connecting to database...
✓ Snapshot created. 12 tables captured.
  Connection ID: a3f7c291be04d1e8
  Verified at: 2026-10-05T06:00:00.000Z
```

The snapshot is stored locally under `.schema-cache/<connection-id>/` in the current working directory. Nothing is sent to a remote server.

### Option B — named profile (recommended for teams)

1. Copy the example config and edit it:

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
         "url": "postgres://user:password@localhost:5432/myapp",
         "schemas": ["public"],
         "comment": "Local development database"
       }
     }
   }
   ```

2. Run `init` (no `--url` flag needed, the default profile is picked up automatically):

   ```bash
   dbctx init
   ```

See the full [Configuration reference](./configuration.md) for all options.

---

## Verifying the snapshot

```bash
dbctx status
```

Example output:

```
{
  "connectionId": "a3f7c291be04d1e8",
  "snapshotAge": "5s ago",
  "verifiedAt": "2026-10-05T06:00:00.000Z",
  "dbReachable": true,
  "tableCount": 12,
  "stale": false
}
--- [verified 2026-10-05T06:00:00.000Z]
```

---

## Typical workflow

```
dbctx init          ← one time per project / DB
  ↓
dbctx tables        ← browse what's there
  ↓
dbctx describe <t>  ← inspect a specific table
  ↓
dbctx related <t>   ← see FK graph neighborhood
  ↓
dbctx refresh       ← after a migration
```

---

## Where it gets stored (Local vs Global)

By default, the snapshot is stored **locally in your current directory**:

```
.schema-cache/
└── <connection-id>/       # 16-char MD5 of host:port/dbname
    ├── schema.json        # normalized snapshot (main data)
    ├── fingerprint.json   # per-table MD5 hashes + verifiedAt
    └── raw/
        └── extract-debug.json   # raw extractor output
```

> **Tip:** Add `.schema-cache/` to your project's `.gitignore`. 

### The `--global` flag

If you prefer to share a single cache across all your projects on your machine, run `dbctx init` with the `--global` flag:

```bash
dbctx init --global
```

This writes the cache to your home directory (`~/.dbctx/cache/`). 

**Cache Precedence:** When you run a query (like `dbctx tables`), `dbctx` automatically checks the local `.schema-cache` first. If it's not found there, it falls back to the global `~/.dbctx/cache/`. This ensures project-specific caches always win if they exist!

---

## Next steps

- [Configuration](./configuration.md) — profiles, multi-schema, TTL
- [Commands](./commands.md) — full CLI reference
- [Output Formats](./output-formats.md) — choosing between `compact`, `md`, and `json`
