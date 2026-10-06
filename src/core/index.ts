// ============================================================
// core/index.ts — public API barrel
// Re-exports everything a programmatic consumer of dbctx needs.
// ============================================================

// Types
export type {
  NormalizedSchema,
  SchemaTable,
  SchemaColumn,
  SchemaConstraint,
  SchemaIndex,
  SchemaTrigger,
  SchemaPolicy,
  EnumDef,
  RelationDef,
  Fingerprint,
  TableSummary,
  IncludeSection,
  OutputFormat,
} from "./types.js";

// Query functions (pure, no DB required — operate on a NormalizedSchema)
export {
  listTables,
  describe,
  getTableSchema,
  getColumns,
  getColumnConstraints,
  related,
  findColumns,
  findCommonColumns,
  joinPath,
  getEnums,
  getPolicies,
  buildStatus,
  searchSchema,
  findByType,
  findPolymorphic,
  checkIndex,
  findOrphans,
} from "./queries.js";

// Store (read/write the local JSON cache)
export {
  readSchema,
  writeSchema,
  readFingerprint,
  writeFingerprint,
  deriveConnectionId,
  getStoreInfo,
} from "./store.js";

// Config resolution
export { loadConfig, resolveConnection } from "./config.js";
