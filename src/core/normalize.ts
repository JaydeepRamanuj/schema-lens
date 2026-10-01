// ============================================================
// normalize.ts — converts raw extractor output into NormalizedSchema.
// Pure function: no DB access, no I/O. Heavily unit-tested.
// ============================================================

import type {
  NormalizedSchema,
  SchemaMeta,
  SchemaTable,
  SchemaColumn,
  SchemaConstraint,
  SchemaIndex,
  SchemaTrigger,
  SchemaPolicy,
  EnumDef,
  RelationDef,
} from "./types.js";
import type {
  ExtractorOutput,
  RawColumn,
  RawConstraint,
  RawIndex,
  RawTrigger,
  RawPolicy,
} from "./extractor/custom.js";

// --------------- Name helpers ---------------

/** Canonical table key: always "schema.tablename" */
function tableKey(schema: string, name: string): string {
  return `${schema}.${name}`;
}

/**
 * Resolve a possibly-bare table name to its canonical "schema.table" key.
 * If the name already contains a dot we trust it as-is.
 */
function resolveTableKey(name: string, defaultSchema = "public"): string {
  return name.includes(".") ? name : `${defaultSchema}.${name}`;
}

// --------------- Column normalizer ---------------

function normalizeColumn(row: RawColumn): SchemaColumn {
  return {
    name: row.name,
    type: row.type,
    nullable: row.nullable,
    default: row.default ?? null,
    comment: row.comment ?? null,
  };
}

// --------------- Constraint normalizer ---------------

function normalizeConstraint(row: RawConstraint): SchemaConstraint {
  const base: SchemaConstraint = {
    name: row.name,
    type: row.type,
    columns: row.columns,
    def: row.def,
  };

  if (row.type === "FOREIGN KEY" && row.ref_table) {
    const refSchema = row.ref_schema ?? "public";
    base.references = {
      table: tableKey(refSchema, row.ref_table),
      columns: row.ref_columns,
    };
    if (row.on_delete) base.onDelete = row.on_delete;
    if (row.on_update) base.onUpdate = row.on_update;
  }

  return base;
}

// --------------- Index normalizer ---------------

function normalizeIndex(row: RawIndex): SchemaIndex {
  return {
    name: row.name,
    columns: row.columns,
    unique: row.unique,
    def: row.def,
  };
}

// --------------- Trigger normalizer ---------------

function parseTriggerEvents(def: string): string[] {
  const events: string[] = [];
  if (/INSERT/i.test(def)) events.push("INSERT");
  if (/UPDATE/i.test(def)) events.push("UPDATE");
  if (/DELETE/i.test(def)) events.push("DELETE");
  if (/TRUNCATE/i.test(def)) events.push("TRUNCATE");
  return events;
}

function normalizeTrigger(row: RawTrigger): SchemaTrigger {
  return {
    name: row.name,
    timing: row.timing as SchemaTrigger["timing"],
    events: parseTriggerEvents(row.def),
    def: row.def,
  };
}

// --------------- Policy normalizer ---------------

function normalizePolicy(row: RawPolicy): SchemaPolicy {
  return {
    name: row.name,
    permissive: row.permissive,
    roles: row.roles,
    cmd: row.cmd,
    qual: row.qual ?? null,
    withCheck: row.with_check ?? null,
  };
}

// --------------- Main normalize function ---------------

export function normalize(
  raw: ExtractorOutput,
  meta: Omit<SchemaMeta, "extractor" | "snapshotVersion">
): NormalizedSchema {
  // ---- Build tables skeleton ----
  const tables: Record<string, SchemaTable> = {};

  for (const t of raw.tables) {
    const key = tableKey(t.schema, t.name);
    tables[key] = {
      type: t.type,
      schema: t.schema,
      comment: t.comment ?? null,
      rlsEnabled: t.rls_enabled,
      rlsForced: t.rls_forced,
      columns: [],
      constraints: [],
      indexes: [],
      triggers: [],
      policies: [],
    };
  }

  // ---- Columns ----
  for (const col of raw.columns) {
    const key = tableKey(col.schema, col.table);
    tables[key]?.columns.push(normalizeColumn(col));
  }

  // ---- Constraints ----
  for (const con of raw.constraints) {
    const key = tableKey(con.schema, con.table);
    tables[key]?.constraints.push(normalizeConstraint(con));
  }

  // ---- Indexes ----
  for (const idx of raw.indexes) {
    const key = tableKey(idx.schema, idx.table);
    tables[key]?.indexes.push(normalizeIndex(idx));
  }

  // ---- Triggers ----
  for (const trig of raw.triggers) {
    const key = tableKey(trig.schema, trig.table);
    tables[key]?.triggers.push(normalizeTrigger(trig));
  }

  // ---- Policies ----
  for (const pol of raw.policies) {
    const key = tableKey(pol.schema, pol.table);
    tables[key]?.policies.push(normalizePolicy(pol));
  }

  // ---- Relations graph ----
  const relations: Record<string, RelationDef> = {};

  // Initialize every table with empty relation slots
  for (const key of Object.keys(tables)) {
    relations[key] = { references: [], referencedBy: [] };
  }

  // Walk FK constraints to populate both directions
  for (const tableEntry of Object.values(tables)) {
    const fromKey = tableKey(tableEntry.schema, ""); // we iterate via table keys below
  }

  for (const [fromKey, table] of Object.entries(tables)) {
    for (const con of table.constraints) {
      if (con.type === "FOREIGN KEY" && con.references) {
        const toKey = con.references.table;
        // outgoing
        if (!relations[fromKey]) relations[fromKey] = { references: [], referencedBy: [] };
        if (!relations[fromKey]!.references.includes(toKey)) {
          relations[fromKey]!.references.push(toKey);
        }
        // incoming
        if (!relations[toKey]) relations[toKey] = { references: [], referencedBy: [] };
        if (!relations[toKey]!.referencedBy.includes(fromKey)) {
          relations[toKey]!.referencedBy.push(fromKey);
        }
      }
    }
  }

  // ---- Enums ----
  const enums: Record<string, EnumDef> = {};
  for (const e of raw.enums) {
    const key = tableKey(e.schema, e.name);
    enums[key] = { schema: e.schema, values: e.values };
  }

  return {
    meta: {
      connectionId: meta.connectionId,
      dbName: meta.dbName,
      generatedAt: meta.generatedAt,
      extractor: "custom",
      snapshotVersion: 1,
    },
    tables,
    relations,
    enums,
  };
}

/**
 * Merge a partial extraction result into an existing NormalizedSchema.
 * Used when only a subset of tables changed (partial refresh).
 * Dropped tables are removed, new/changed tables are updated in place.
 */
export function mergePartial(
  existing: NormalizedSchema,
  partial: ExtractorOutput,
  freshnessResult: { changedTables: string[]; newTables: string[]; droppedTables: string[] }
): NormalizedSchema {
  // Deep clone to avoid mutating the existing object
  const merged: NormalizedSchema = JSON.parse(JSON.stringify(existing));

  // Remove dropped tables
  for (const key of freshnessResult.droppedTables) {
    delete merged.tables[key];
    delete merged.relations[key];
    // Remove this table from other tables' referencedBy
    for (const rel of Object.values(merged.relations)) {
      rel.referencedBy = rel.referencedBy.filter((k) => k !== key);
      rel.references = rel.references.filter((k) => k !== key);
    }
  }

  // Get new/changed table keys
  const affectedKeys = new Set([
    ...freshnessResult.changedTables,
    ...freshnessResult.newTables,
  ]);

  if (affectedKeys.size === 0) return merged;

  // Build a temporary NormalizedSchema from the partial extraction
  const partialSchema = normalize(partial, {
    connectionId: existing.meta.connectionId,
    dbName: existing.meta.dbName,
    generatedAt: new Date().toISOString(),
  });

  // Overwrite only the affected tables
  for (const key of affectedKeys) {
    if (partialSchema.tables[key]) {
      merged.tables[key] = partialSchema.tables[key]!;
    }
  }

  // Rebuild relations entirely from the merged tables
  const relations: Record<string, RelationDef> = {};
  for (const key of Object.keys(merged.tables)) {
    relations[key] = { references: [], referencedBy: [] };
  }
  for (const [fromKey, table] of Object.entries(merged.tables)) {
    for (const con of table.constraints) {
      if (con.type === "FOREIGN KEY" && con.references) {
        const toKey = con.references.table;
        if (!relations[fromKey]) relations[fromKey] = { references: [], referencedBy: [] };
        if (!relations[fromKey]!.references.includes(toKey)) {
          relations[fromKey]!.references.push(toKey);
        }
        if (!relations[toKey]) relations[toKey] = { references: [], referencedBy: [] };
        if (!relations[toKey]!.referencedBy.includes(fromKey)) {
          relations[toKey]!.referencedBy.push(fromKey);
        }
      }
    }
  }
  merged.relations = relations;

  // Update enums
  if (freshnessResult.changedTables.length > 0 || freshnessResult.newTables.length > 0) {
    merged.enums = partialSchema.enums;
  }

  merged.meta.generatedAt = new Date().toISOString();
  return merged;
}
