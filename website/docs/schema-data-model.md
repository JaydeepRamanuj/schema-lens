# Schema Data Model

This document describes the TypeScript types that form the normalized snapshot stored in `schema.json`. Understanding these types is useful when consuming `--format json` output or building tooling on top of `dbctx`.

All types are defined in [`src/core/types.ts`](https://github.com/jdr-topia/schema-lens/blob/main/src/core/types.ts).

---

## Top-level: `NormalizedSchema`

```ts
interface NormalizedSchema {
  meta: SchemaMeta;
  tables: Record<string, SchemaTable>;   // key: "schema.tablename"
  relations: Record<string, RelationDef>;
  enums: Record<string, EnumDef>;        // key: "schema.enumname"
}
```

The `tables`, `relations`, and `enums` records all use `"schema.name"` as the key (e.g. `"public.users"`, `"analytics.events"`). Bare table names without a dot are resolved to the `public` schema in every query command.

---

## `SchemaMeta`

Metadata written at extraction time.

```ts
interface SchemaMeta {
  connectionId: string;      // 16-char MD5 hex of host:port/dbname
  dbName: string;            // result of SELECT current_database()
  generatedAt: string;       // ISO 8601 timestamp
  extractor: "custom";       // always "custom" in v1
  snapshotVersion: number;   // always 1 in v1
}
```

---

## `SchemaTable`

Full representation of a single table, view, or materialized view.

```ts
interface SchemaTable {
  type: "table" | "view" | "materialized_view";
  schema: string;            // e.g. "public"
  comment: string | null;    // pg_class comment via obj_description()
  rlsEnabled: boolean;       // pg_class.relrowsecurity
  rlsForced: boolean;        // pg_class.relforcerowsecurity
  columns: SchemaColumn[];
  constraints: SchemaConstraint[];
  indexes: SchemaIndex[];
  triggers: SchemaTrigger[];
  policies: SchemaPolicy[];
}
```

**Table type mapping from pg_class.relkind:**

| `relkind` | `type` |
| --- | --- |
| `r` | `table` |
| `p` | `table` (partitioned) |
| `v` | `view` |
| `m` | `materialized_view` |

---

## `SchemaColumn`

```ts
interface SchemaColumn {
  name: string;           // column name (attname)
  type: string;           // e.g. "uuid", "text", "numeric(10,2)", "timestamp with time zone"
  nullable: boolean;      // true when the column allows NULL (NOT attnotnull)
  default: string | null; // pg_get_expr output, e.g. "gen_random_uuid()", "now()", null
  comment: string | null; // col_description() result
}
```

`type` is the result of `format_type(atttypid, atttypmod)`, which produces the full PostgreSQL type name including precision/scale where applicable.

---

## `SchemaConstraint`

```ts
type ConstraintType = "PRIMARY KEY" | "FOREIGN KEY" | "UNIQUE" | "CHECK";

interface SchemaConstraint {
  name: string;
  type: ConstraintType;
  columns: string[];             // column names involved
  references?: {                 // only present for FOREIGN KEY
    table: string;               // "schema.tablename" of the referenced table
    columns: string[];           // referenced column names
  };
  onDelete?: string;             // "CASCADE" | "RESTRICT" | "SET NULL" | "SET DEFAULT" | "NO ACTION"
  onUpdate?: string;             // same values as onDelete
  def?: string;                  // full pg_get_constraintdef() output
}
```

`references`, `onDelete`, and `onUpdate` are only present on `FOREIGN KEY` constraints.

**Constraint type mapping from pg_constraint.contype:**

| `contype` | `ConstraintType` |
| --- | --- |
| `p` | `PRIMARY KEY` |
| `f` | `FOREIGN KEY` |
| `u` | `UNIQUE` |
| `c` | `CHECK` |

---

## `SchemaIndex`

Non-primary-key indexes only. Primary key indexes are represented as `PRIMARY KEY` constraints.

```ts
interface SchemaIndex {
  name: string;
  columns: string[];   // column names in index order
  unique: boolean;     // pg_index.indisunique
  def: string;         // full pg_get_indexdef() output
}
```

---

## `SchemaTrigger`

```ts
interface SchemaTrigger {
  name: string;
  timing: "BEFORE" | "AFTER" | "INSTEAD OF";
  events: string[];   // e.g. ["INSERT", "UPDATE"] — parsed from def
  def: string;        // full pg_get_triggerdef() output
}
```

`events` is derived by scanning the `def` string for the keywords `INSERT`, `UPDATE`, `DELETE`, and `TRUNCATE`. Internal triggers (e.g. constraint triggers) are excluded by the extractor.

---

## `SchemaPolicy`

Row-Level Security policies from `pg_policies`.

```ts
interface SchemaPolicy {
  name: string;
  permissive: boolean;      // true = PERMISSIVE, false = RESTRICTIVE
  roles: string[];           // database roles this policy applies to
  cmd: string;               // "ALL" | "SELECT" | "INSERT" | "UPDATE" | "DELETE"
  qual: string | null;       // USING expression (filter for reads)
  withCheck: string | null;  // WITH CHECK expression (filter for writes)
}
```

---

## `RelationDef`

A bidirectional FK graph node. Every table in `tables` has a corresponding entry in `relations`.

```ts
interface RelationDef {
  references: string[];    // tables this one has an outgoing FK to
  referencedBy: string[];  // tables that have an FK pointing to this one
}
```

Both arrays contain `"schema.tablename"` keys. The `related` and `join-path` commands traverse this graph without touching the database.

---

## `EnumDef`

```ts
interface EnumDef {
  schema: string;
  values: string[];  // enum labels in sort order (enumsortorder)
}
```

Enum keys in `NormalizedSchema.enums` are `"schema.enumname"`.

---

## `Fingerprint`

Stored in `fingerprint.json`. Used internally for change detection.

```ts
interface TableFingerprint {
  hash: string;   // MD5 of columns + constraints + indexes (computed by DB)
}

interface Fingerprint {
  tables: Record<string, TableFingerprint>;  // key: "schema.tablename"
  enumsHash: string;                          // MD5 of all enum definitions
  verifiedAt: string;                         // ISO 8601 timestamp
}
```

---

## Query response types

These are the shapes returned in the `result` field of `--format json` output.

### `listTables` → `ListTablesResult`

```ts
interface ListTablesResult {
  tables: TableSummary[];
  total: number;
}

interface TableSummary {
  name: string;                          // "schema.tablename"
  type: "table" | "view" | "materialized_view";
  comment: string | null;
}
```

### `describe` → `DescribeResult`

```ts
interface DescribeResult {
  tables: Record<string, Partial<SchemaTable>>;  // key: "schema.tablename"
}
```

`Partial<SchemaTable>` because `--include` may exclude some sections.

### `related` → `RelatedResult`

```ts
interface RelatedResult {
  root: string;    // "schema.tablename"
  depth: number;
  nodes: string[]; // all connected table keys (excluding root)
  edges: Array<{ from: string; to: string; via: string[] }>;
}
```

### `find-column` → `FindColumnsResult`

```ts
interface FindColumnsResult {
  pattern: string;
  matches: Array<{ table: string; column: SchemaColumn }>;
}
```

### `join-path` → `JoinPathResult`

```ts
interface JoinPathResult {
  from: string;
  to: string;
  path: string[] | null;  // null when no FK path exists
  edges: Array<{ from: string; to: string; via: string[] }>;
}
```

### `status` → `StatusResult`

```ts
interface StatusResult {
  connectionId: string;
  snapshotAge: string | null;  // e.g. "2m ago", "1h ago", null if no snapshot
  verifiedAt: string | null;
  dbReachable: boolean;
  tableCount: number | null;   // null if no snapshot
  stale: boolean;
}
```

### `getEnums` → `GetEnumsResult`

```ts
interface GetEnumsResult {
  enums: Record<string, EnumDef>;  // key: "schema.enumname"
}
```

### `getPolicies` → `GetPoliciesResult`

```ts
interface GetPoliciesResult {
  policies: Array<{ table: string; policy: SchemaPolicy }>;
}
```

---

## Output format type

```ts
type OutputFormat = "json" | "md" | "compact";
```

---

## Include section type

Used by the `describe` command's `--include` flag:

```ts
type IncludeSection = "columns" | "constraints" | "indexes" | "fks" | "policies" | "triggers";
```

`fks` is a shorthand that selects only `FOREIGN KEY` entries from the constraints array, without requiring the full `constraints` section.
