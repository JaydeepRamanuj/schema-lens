// ============================================================
// extractor/custom.ts — full schema extraction via pg_catalog.
// No third-party binary dependency; all queries run through `pg`.
// All 7 queries run in a single READ ONLY transaction.
// ============================================================

import pg from "pg";
import type {
  SchemaColumn,
  SchemaConstraint,
  SchemaIndex,
  SchemaTrigger,
  SchemaPolicy,
  SchemaTable,
  ConstraintType,
} from "../types.js";

// --------------- Raw row shapes (internal) ---------------

interface RawTable {
  schema: string;
  name: string;
  type: "table" | "view" | "materialized_view";
  rls_enabled: boolean;
  rls_forced: boolean;
  comment: string | null;
}

interface RawColumn {
  schema: string;
  table: string;
  attnum: number;
  name: string;
  type: string;
  nullable: boolean;
  default: string | null;
  comment: string | null;
}

interface RawConstraint {
  schema: string;
  table: string;
  name: string;
  type: ConstraintType;
  columns: string[];
  ref_schema: string | null;
  ref_table: string | null;
  ref_columns: string[];
  on_delete: string | null;
  on_update: string | null;
  def: string;
}

interface RawIndex {
  schema: string;
  table: string;
  name: string;
  unique: boolean;
  columns: string[];
  def: string;
}

interface RawTrigger {
  schema: string;
  table: string;
  name: string;
  timing: string;
  def: string;
}

interface RawPolicy {
  schema: string;
  table: string;
  name: string;
  permissive: boolean;
  roles: string[];
  cmd: string;
  qual: string | null;
  with_check: string | null;
}

interface RawEnum {
  schema: string;
  name: string;
  values: string[];
}

export interface ExtractorOutput {
  tables: RawTable[];
  columns: RawColumn[];
  constraints: RawConstraint[];
  indexes: RawIndex[];
  triggers: RawTrigger[];
  policies: RawPolicy[];
  enums: RawEnum[];
}

// --------------- Queries ---------------

const Q_TABLES = `
SELECT
  n.nspname AS schema,
  c.relname AS name,
  CASE c.relkind
    WHEN 'r' THEN 'table'
    WHEN 'v' THEN 'view'
    WHEN 'm' THEN 'materialized_view'
    WHEN 'p' THEN 'table'
  END AS type,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced,
  obj_description(c.oid, 'pg_class') AS comment
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind IN ('r', 'v', 'm', 'p')
  AND n.nspname = ANY($1)
ORDER BY 1, 2
`;

const Q_COLUMNS = `
SELECT
  n.nspname AS schema,
  c.relname AS table,
  a.attnum,
  a.attname AS name,
  format_type(a.atttypid, a.atttypmod) AS type,
  NOT a.attnotnull AS nullable,
  pg_get_expr(d.adbin, d.adrelid) AS default,
  col_description(a.attrelid, a.attnum) AS comment
FROM pg_attribute a
JOIN pg_class c ON c.oid = a.attrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
WHERE a.attnum > 0
  AND NOT a.attisdropped
  AND n.nspname = ANY($1)
ORDER BY n.nspname, c.relname, a.attnum
`;

const Q_CONSTRAINTS = `
SELECT
  n.nspname AS schema,
  c.relname AS table,
  co.conname AS name,
  CASE co.contype
    WHEN 'p' THEN 'PRIMARY KEY'
    WHEN 'f' THEN 'FOREIGN KEY'
    WHEN 'u' THEN 'UNIQUE'
    WHEN 'c' THEN 'CHECK'
  END AS type,
  ARRAY(
    SELECT a.attname
    FROM pg_attribute a
    WHERE a.attrelid = co.conrelid
      AND a.attnum = ANY(co.conkey)
    ORDER BY array_position(co.conkey, a.attnum)
  ) AS columns,
  fn.nspname AS ref_schema,
  fc.relname AS ref_table,
  COALESCE(
    ARRAY(
      SELECT a.attname
      FROM pg_attribute a
      WHERE a.attrelid = co.confrelid
        AND a.attnum = ANY(co.confkey)
      ORDER BY array_position(co.confkey, a.attnum)
    ),
    ARRAY[]::text[]
  ) AS ref_columns,
  CASE co.confdeltype
    WHEN 'a' THEN 'NO ACTION'
    WHEN 'r' THEN 'RESTRICT'
    WHEN 'c' THEN 'CASCADE'
    WHEN 'n' THEN 'SET NULL'
    WHEN 'd' THEN 'SET DEFAULT'
    ELSE NULL
  END AS on_delete,
  CASE co.confupdtype
    WHEN 'a' THEN 'NO ACTION'
    WHEN 'r' THEN 'RESTRICT'
    WHEN 'c' THEN 'CASCADE'
    WHEN 'n' THEN 'SET NULL'
    WHEN 'd' THEN 'SET DEFAULT'
    ELSE NULL
  END AS on_update,
  pg_get_constraintdef(co.oid) AS def
FROM pg_constraint co
JOIN pg_class c ON c.oid = co.conrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_class fc ON fc.oid = co.confrelid
LEFT JOIN pg_namespace fn ON fn.oid = fc.relnamespace
WHERE n.nspname = ANY($1)
  AND co.contype IN ('p', 'f', 'u', 'c')
ORDER BY n.nspname, c.relname, co.conname
`;

const Q_INDEXES = `
SELECT
  n.nspname AS schema,
  c.relname AS table,
  ic.relname AS name,
  ix.indisunique AS unique,
  ARRAY(
    SELECT a.attname
    FROM pg_attribute a
    WHERE a.attrelid = c.oid
      AND a.attnum = ANY(ix.indkey)
      AND a.attnum > 0
    ORDER BY array_position(ix.indkey::smallint[], a.attnum)
  ) AS columns,
  pg_get_indexdef(ix.indexrelid) AS def
FROM pg_index ix
JOIN pg_class c ON c.oid = ix.indrelid
JOIN pg_class ic ON ic.oid = ix.indexrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = ANY($1)
  AND NOT ix.indisprimary
ORDER BY n.nspname, c.relname, ic.relname
`;

const Q_TRIGGERS = `
SELECT
  n.nspname AS schema,
  c.relname AS table,
  t.tgname AS name,
  CASE
    WHEN (t.tgtype & 2)  > 0 THEN 'BEFORE'
    WHEN (t.tgtype & 64) > 0 THEN 'INSTEAD OF'
    ELSE 'AFTER'
  END AS timing,
  pg_get_triggerdef(t.oid) AS def
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = ANY($1)
  AND NOT t.tgisinternal
ORDER BY n.nspname, c.relname, t.tgname
`;

const Q_POLICIES = `
SELECT
  schemaname AS schema,
  tablename AS table,
  policyname AS name,
  permissive = 'PERMISSIVE' AS permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = ANY($1)
ORDER BY schemaname, tablename, policyname
`;

const Q_ENUMS = `
SELECT
  n.nspname AS schema,
  t.typname AS name,
  array_agg(e.enumlabel ORDER BY e.enumsortorder) AS values
FROM pg_type t
JOIN pg_enum e ON e.enumtypid = t.oid
JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = ANY($1)
GROUP BY n.nspname, t.typname
ORDER BY 1, 2
`;

// --------------- Main extractor function ---------------

export async function extract(
  client: pg.Client,
  schemas: string[]
): Promise<ExtractorOutput> {
  await client.query("BEGIN");
  await client.query("SET TRANSACTION READ ONLY");

  try {
    const [tables, columns, constraints, indexes, triggers, policies, enums] =
      await Promise.all([
        client.query<RawTable>(Q_TABLES, [schemas]),
        client.query<RawColumn>(Q_COLUMNS, [schemas]),
        client.query<RawConstraint>(Q_CONSTRAINTS, [schemas]),
        client.query<RawIndex>(Q_INDEXES, [schemas]),
        client.query<RawTrigger>(Q_TRIGGERS, [schemas]),
        client.query<RawPolicy>(Q_POLICIES, [schemas]),
        client.query<RawEnum>(Q_ENUMS, [schemas]),
      ]);

    await client.query("COMMIT");

    return {
      tables: tables.rows,
      columns: columns.rows,
      constraints: constraints.rows,
      indexes: indexes.rows,
      triggers: triggers.rows,
      policies: policies.rows,
      enums: enums.rows,
    };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw err;
  }
}

// --------------- Partial extractor (specific tables only) ---------------

export async function extractTables(
  client: pg.Client,
  schemas: string[],
  tableNames: string[] // "schema.table" keys
): Promise<ExtractorOutput> {
  // Parse into schema + relname pairs for the query
  const pairs = tableNames.map((t) => {
    const dot = t.indexOf(".");
    return dot === -1 ? ["public", t] : [t.slice(0, dot), t.slice(dot + 1)];
  });

  const schemaList = [...new Set(pairs.map((p) => p[0]))];
  const nameList = pairs.map((p) => p[1]);

  const addFilter = (q: string) =>
    q +
    `\n  AND c.relname = ANY($2) AND n.nspname = ANY($3)`.replace(
      "AND n.nspname = ANY($1)",
      ""
    );

  // For simplicity in partial refresh: extract full schema for affected schemas
  // and filter to just the changed tables in the caller (normalize handles merge).
  // This avoids complex partial-query logic while still limiting rows returned.
  await client.query("BEGIN");
  await client.query("SET TRANSACTION READ ONLY");

  try {
    const [tables, columns, constraints, indexes, triggers, policies, enums] =
      await Promise.all([
        client.query<RawTable>(Q_TABLES, [schemaList]),
        client.query<RawColumn>(Q_COLUMNS, [schemaList]),
        client.query<RawConstraint>(Q_CONSTRAINTS, [schemaList]),
        client.query<RawIndex>(Q_INDEXES, [schemaList]),
        client.query<RawTrigger>(Q_TRIGGERS, [schemaList]),
        client.query<RawPolicy>(Q_POLICIES, [schemaList]),
        client.query<RawEnum>(Q_ENUMS, [schemaList]),
      ]);

    await client.query("COMMIT");

    // Filter to only the requested tables
    const inSet = new Set(nameList);
    return {
      tables: tables.rows.filter((r) => inSet.has(r.name)),
      columns: columns.rows.filter((r) => inSet.has(r.table)),
      constraints: constraints.rows.filter((r) => inSet.has(r.table)),
      indexes: indexes.rows.filter((r) => inSet.has(r.table)),
      triggers: triggers.rows.filter((r) => inSet.has(r.table)),
      policies: policies.rows.filter((r) => inSet.has(r.table)),
      enums: enums.rows, // always include all enums
    };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw err;
  }
}

// Re-export raw types for use in normalize.ts
export type {
  RawTable,
  RawColumn,
  RawConstraint,
  RawIndex,
  RawTrigger,
  RawPolicy,
  RawEnum,
};
