---
title: "Output Formats"
---

# Output Formats

Every command supports three output formats selected via the `--format` flag or the `defaultFormat` config key.

| Format | Flag value | Best for |
| --- | --- | --- |
| Compact | `compact` | Terminal use, agent consumption, quick scanning |
| Markdown | `md` | Documentation, GitHub, Notion, embedding in prompts |
| JSON | `json` | Machine parsing, piping into `jq`, programmatic agents |

---

## Freshness footer

Every output — regardless of format — ends with a **freshness footer** on its own line:

```
--- [verified <ISO timestamp>]
--- [verified <ISO timestamp> | refreshed: true]
--- [verified <ISO timestamp> | stale: true (db unreachable)]
```

| Part | When present | Meaning |
| --- | --- | --- |
| `verified <ts>` | Always | Timestamp of the last fingerprint verification |
| `refreshed: true` | When the snapshot was re-extracted during this invocation | The DB was queried and the cache was updated |
| `stale: true (<reason>)` | When the DB was unreachable | Stale cache is being served; data may be out of date |

In `json` format the freshness metadata appears as top-level keys instead of an appended line:

```json
{
  "result": { ... },
  "verifiedAt": "2026-10-05T06:00:00.000Z",
  "refreshed": false,
  "stale": false
}
```

---

## compact format

The default format. Human-readable, token-efficient, no extra markup. Each command produces its own compact representation.

### `tables --format compact`

```
public.order_items (table)
public.orders (table)  -- Customer orders
public.products (table)  -- Product catalog
public.users (table)  -- Application users
--- [verified 2026-10-05T06:00:00.000Z]
```

One line per table: `<schema.name> (<type>)  -- <comment>`. Comment is omitted if null.

### `describe --format compact`

```

public.users (table)
  -- Application users
  id uuid PK not null default gen_random_uuid()
  email text UNIQUE not null
  created_at timestamp with time zone not null default now()
  [INDEX users_email_idx (email) UNIQUE]

public.orders (table)
  -- Customer orders
  id uuid PK not null default gen_random_uuid()
  user_id uuid not null → public.users.id (ON DELETE CASCADE)
  status order_status not null default 'pending'
  total numeric(10,2) not null (total >= 0)
  [INDEX orders_user_id_idx (user_id)]
--- [verified 2026-10-05T06:00:00.000Z]
```

Column line format:

```
  <name> <type> [PK] [UNIQUE] [not null] [default <expr>] [<check expr>] [→ <ref table>.<ref cols> (ON DELETE <action>)]
```

Multi-column PKs and UNIQUE constraints are listed at the end of the table block:

```
  [PRIMARY KEY (tenant_id, user_id)]
  [UNIQUE (email, tenant_id)]
```

Non-PK indexes:

```
  [INDEX <name> (<cols>) [UNIQUE]]
```

### `columns --format compact`

```
  id uuid not null default gen_random_uuid()
  email text not null
  created_at timestamp with time zone not null default now()
--- [verified 2026-10-05T06:00:00.000Z]
```

### `related --format compact`

```
public.orders (depth: 1)
  public.orders → public.users  via (user_id)
  public.order_items → public.orders  via (order_id)
--- [verified 2026-10-05T06:00:00.000Z]
```

### `find-column --format compact`

```
public.orders.user_id  (uuid)
public.profiles.user_id  (uuid)
--- [verified 2026-10-05T06:00:00.000Z]
```

### `join-path --format compact`

```
public.users → public.orders → public.order_items
  public.orders → public.users  via (user_id)
  public.order_items → public.orders  via (order_id)
--- [verified 2026-10-05T06:00:00.000Z]
```

### `enums --format compact`

```
public.order_status: pending, paid, shipped, cancelled
--- [verified 2026-10-05T06:00:00.000Z]
```

### `policies --format compact`

```
public.orders: orders_user_policy (SELECT, permissive)
--- [verified 2026-10-05T06:00:00.000Z]
```

---

## md format

Produces GitHub-flavored Markdown tables and headings. Designed for embedding in documentation or in AI prompts where a structured, readable format is preferred.

### `tables --format md`

```markdown
| Table | Type | Comment |
| --- | --- | --- |
| public.order_items | table |  |
| public.orders | table | Customer orders |
| public.products | table | Product catalog |
| public.users | table | Application users |
--- [verified 2026-10-05T06:00:00.000Z]
```

### `describe --format md`

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

--- [verified 2026-10-05T06:00:00.000Z]
```

For commands other than `describe` and `tables`, the `md` format falls back to pretty-printed JSON followed by the freshness footer.

---

## json format

Returns a single JSON object. The freshness metadata is embedded as top-level keys alongside `result`.

### Envelope structure

```json
{
  "result": <command-specific payload>,
  "verifiedAt": "2026-10-05T06:00:00.000Z",
  "refreshed": false,
  "stale": false,
  "staleReason": "db unreachable"   // only present when stale: true
}
```

`staleReason` is only present when `stale` is `true`. Current possible values: `"db unreachable"`.

### `tables --format json`

```json
{
  "result": {
    "tables": [
      { "name": "public.users", "type": "table", "comment": "Application users" },
      { "name": "public.orders", "type": "table", "comment": "Customer orders" }
    ],
    "total": 2
  },
  "verifiedAt": "2026-10-05T06:00:00.000Z",
  "refreshed": false,
  "stale": false
}
```

### `describe --format json`

```json
{
  "result": {
    "tables": {
      "public.users": {
        "type": "table",
        "schema": "public",
        "comment": "Application users",
        "rlsEnabled": false,
        "rlsForced": false,
        "columns": [
          { "name": "id", "type": "uuid", "nullable": false, "default": "gen_random_uuid()", "comment": null }
        ],
        "constraints": [
          { "name": "users_pkey", "type": "PRIMARY KEY", "columns": ["id"], "def": "PRIMARY KEY (id)" }
        ],
        "indexes": [
          { "name": "users_email_idx", "columns": ["email"], "unique": true, "def": "CREATE UNIQUE INDEX ..." }
        ],
        "triggers": [],
        "policies": []
      }
    }
  },
  "verifiedAt": "2026-10-05T06:00:00.000Z",
  "refreshed": false,
  "stale": false
}
```

### `related --format json`

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
  },
  "verifiedAt": "...",
  "refreshed": false,
  "stale": false
}
```

### `find-column --format json`

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
  },
  "verifiedAt": "...",
  "refreshed": false,
  "stale": false
}
```

### `join-path --format json`

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
  },
  "verifiedAt": "...",
  "refreshed": false,
  "stale": false
}
```

When no path exists, `path` is `null` and `edges` is `[]`.

### `enums --format json`

```json
{
  "result": {
    "enums": {
      "public.order_status": {
        "schema": "public",
        "values": ["pending", "paid", "shipped", "cancelled"]
      }
    }
  },
  "verifiedAt": "...",
  "refreshed": false,
  "stale": false
}
```

### `status --format json`

```json
{
  "result": {
    "connectionId": "a3f7c291be04d1e8",
    "snapshotAge": "2m ago",
    "verifiedAt": "2026-10-05T06:00:00.000Z",
    "dbReachable": true,
    "tableCount": 12,
    "stale": false
  },
  "verifiedAt": "2026-10-05T06:00:00.000Z",
  "refreshed": false,
  "stale": false
}
```

---

## Setting a default format

Add `defaultFormat` to your config file to avoid repeating `--format` on every call:

```json
{
  "defaultFormat": "json",
  "profiles": { ... }
}
```

The precedence is: `--format` flag > `defaultFormat` in config > `"compact"`.

---

## Piping JSON output

```bash
# All tables as a simple name list
dbctx tables --format json | jq -r '.result.tables[].name'

# Column names for a specific table
dbctx describe users --format json | jq -r '.result.tables["public.users"].columns[].name'

# Check if snapshot is stale
dbctx status --format json | jq '.result.stale'
```
