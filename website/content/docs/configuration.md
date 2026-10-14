---
title: "Configuration"
---

# Configuration

`dbctx` resolves its connection details in the following priority order:

1. `--url` flag (highest priority)
2. `DBCTX_URL` environment variable
3. Named profile from `dbctx.config.json`

If none of these is present, the command fails with a clear error listing the available profiles.

---

## Config file location

`dbctx` searches for `dbctx.config.json` by walking **up** from the current working directory toward the filesystem root, stopping at the first file it finds. This means you can place one config at the repo root and it will be found from any subdirectory.

You can override the search entirely by setting:

```bash
DBCTX_CONFIG=/absolute/path/to/dbctx.config.json dbctx tables
```

---

## Full config schema

```json
{
  "default": "myapp-dev",
  "ttlSeconds": 5,
  "defaultFormat": "compact",
  "profiles": {
    "myapp-dev": {
      "url": "postgres://user:password@host:5432/dbname",
      "schemas": ["public"],
      "comment": "Optional human-readable label"
    },
    "myapp-staging": {
      "url": "postgres://user:password@staging-host:5432/dbname",
      "schemas": ["public", "analytics"]
    }
  }
}
```

### Top-level fields

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `default` | `string` | `"default"` | Name of the profile used when `--name` is not specified |
| `ttlSeconds` | `integer ≥ 0` | `5` | How many seconds a verified fingerprint is trusted before the DB is queried again. Set to `0` to always recheck. |
| `defaultFormat` | `"json" \| "md" \| "compact"` | `"compact"` | Output format used when `--format` is not passed |
| `profiles` | `Record<string, Profile>` | `{}` | Named connection profiles |

### Profile fields

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `url` | `string` | ✅ | Full PostgreSQL connection string |
| `schemas` | `string[]` | ✅ (min 1) | PostgreSQL schemas to capture. Defaults to `["public"]` |
| `comment` | `string` | ❌ | Free-text label, ignored by the tool |

---

## Environment variables

| Variable | Description |
| --- | --- |
| `DBCTX_URL` | Full connection URL. Used when no `--url` flag is given and no profile is resolved. Schemas default to `["public"]`. |
| `DBCTX_CONFIG` | Absolute path to the config file. Skips the directory-walk lookup. |

### Example — CI pipeline

```bash
export DBCTX_URL=postgres://ci_user:$DB_PASS@db:5432/app
dbctx init
dbctx tables --format json
```

---

## Connection ID

Every resolved connection is identified by a **connection ID**: a 16-character MD5 hex string derived from `host:port/dbname` (credentials are never included). This ID is used as the directory name under `.schema-cache/`.

```
postgres://user:pass@localhost:5432/myapp
                    ↓ strip credentials
             localhost:5432/myapp
                    ↓ MD5
             a3f7c291be04d1e8
```

Two developers connecting to the same host/port/database will share the same connection ID directory name, but each developer's cache is local — there is no shared server.

---

## Multi-schema support

To capture tables from multiple PostgreSQL schemas, list them all in the profile:

```json
{
  "profiles": {
    "myapp": {
      "url": "postgres://...",
      "schemas": ["public", "analytics", "billing"]
    }
  }
}
```

All commands then operate across all listed schemas. Table names in the output are always fully qualified (`schema.tablename`).

> **Note:** When using `--url` or `DBCTX_URL`, only the `public` schema is captured. Use a profile to capture additional schemas.

---

## Selecting a profile at runtime

```bash
dbctx tables --name myapp-staging
```

The `--name` flag is supported by every command. It overrides the `default` key in the config file.
