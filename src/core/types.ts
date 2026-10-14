// ============================================================
// types.ts — canonical type definitions for the entire tool.
// Every other module imports from here; no logic lives here.
// ============================================================

// --------------- Store meta ---------------

export interface SchemaMeta {
  connectionId: string;
  dbName: string;
  generatedAt: string; // ISO 8601
  extractor: "custom";
  snapshotVersion: number;
}

// --------------- Table internals ---------------

export interface SchemaColumn {
  name: string;
  type: string; // e.g. "uuid", "text", "numeric(10,2)"
  nullable: boolean;
  default: string | null;
  comment: string | null;
}

export type ConstraintType = "PRIMARY KEY" | "FOREIGN KEY" | "UNIQUE" | "CHECK";

export interface SchemaConstraint {
  name: string;
  type: ConstraintType;
  columns: string[];
  references?: { table: string; columns: string[] }; // FOREIGN KEY only
  onDelete?: string;
  onUpdate?: string;
  def?: string; // full pg_get_constraintdef output
}

export interface SchemaIndex {
  name: string;
  columns: string[];
  unique: boolean;
  def: string; // full pg_get_indexdef output
}

export interface SchemaTrigger {
  name: string;
  timing: "BEFORE" | "AFTER" | "INSTEAD OF";
  events: string[]; // e.g. ["INSERT", "UPDATE"]
  def: string;
}

export interface SchemaPolicy {
  name: string;
  permissive: boolean;
  roles: string[];
  cmd: string; // ALL | SELECT | INSERT | UPDATE | DELETE
  qual: string | null; // USING expression
  withCheck: string | null; // WITH CHECK expression
}

// --------------- Table ---------------

export interface SchemaTable {
  type: "table" | "view" | "materialized_view";
  schema: string;
  comment: string | null;
  rlsEnabled: boolean;
  rlsForced: boolean;
  columns: SchemaColumn[];
  constraints: SchemaConstraint[];
  indexes: SchemaIndex[];
  triggers: SchemaTrigger[];
  policies: SchemaPolicy[];
}

// --------------- Top-level schema ---------------

export interface EnumDef {
  schema: string;
  values: string[];
}

export interface RelationDef {
  references: string[]; // tables this one has FK to
  referencedBy: string[]; // tables that have FK pointing here
}

export interface NormalizedSchema {
  meta: SchemaMeta;
  tables: Record<string, SchemaTable>; // key: "schema.tablename"
  relations: Record<string, RelationDef>;
  enums: Record<string, EnumDef>; // key: "schema.enumname"
}

// --------------- Fingerprint ---------------

export interface TableFingerprint {
  hash: string; // MD5 of columns + constraints + indexes
}

export interface Fingerprint {
  tables: Record<string, TableFingerprint>; // key: "schema.tablename"
  enumsHash: string; // MD5 of all enum definitions
  verifiedAt: string; // ISO 8601
}

// --------------- Freshness ---------------

export interface FreshnessResult {
  isFresh: boolean;
  changedTables: string[];
  newTables: string[];
  droppedTables: string[];
  enumsChanged: boolean;
  wasDbUnreachable: boolean;
}

// --------------- Query response wrapper ---------------

export interface QueryResponse<T> {
  data: T;
  verifiedAt: string;
  refreshed: boolean;
  stale: boolean;
  staleReason?: string;
}

// --------------- Query result types ---------------

export interface TableSummary {
  name: string; // "schema.tablename"
  type: SchemaTable["type"];
  comment: string | null;
}

export interface DescribeResult {
  tables: Record<string, Partial<SchemaTable>>;
}

export interface RelatedResult {
  root: string;
  depth: number;
  nodes: string[];
  edges: Array<{ from: string; to: string; via: string[] }>; // FK column names
}

export interface FindColumnsResult {
  pattern: string;
  matches: Array<{ table: string; column: SchemaColumn }>;
}

export interface FindCommonColumnsResult {
  tables: string[];
  pattern?: string;
  columns: string[]; // column names present in all specified tables
}

export interface JoinPathResult {
  from: string;
  to: string;
  path: string[] | null; // null if no FK path exists
  edges: Array<{ from: string; to: string; via: string[] }>;
}

export interface SearchSchemaMatch {
  type: "table" | "column" | "enum";
  location: string;
  name: string;
  comment?: string | null | undefined;
  matchReason: string;
}

export interface SearchSchemaResult {
  keyword: string;
  matches: SearchSchemaMatch[];
}

export interface FindByTypeResult {
  type: string;
  matches: Array<{ table: string; column: SchemaColumn }>;
}

export interface FindPolymorphicResult {
  matches: Array<{
    table: string;
    typeColumn: string;
    idColumn: string;
  }>;
}

export interface CheckIndexResult {
  table: string;
  columns: string[];
  covered: boolean;
  coveringIndex?: SchemaIndex | undefined;
  partialMatches: SchemaIndex[];
}

export interface FindOrphansResult {
  orphans: string[];
}

export interface StatusResult {
  connectionId: string;
  snapshotAge: string | null; // human-readable, e.g. "2m ago"
  verifiedAt: string | null;
  dbReachable: boolean;
  tableCount: number | null;
  stale: boolean;
}

export type OutputFormat = "json" | "md" | "compact";

export type IncludeSection = "columns" | "constraints" | "indexes" | "fks" | "policies" | "triggers";
