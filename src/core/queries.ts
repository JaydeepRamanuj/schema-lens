// ============================================================
// queries.ts — all agent-facing query functions.
// Pure functions over NormalizedSchema — no DB access, no I/O.
// One function per realistic agent question (spec Section 5.4).
// ============================================================

import type {
  NormalizedSchema,
  SchemaTable,
  SchemaColumn,
  SchemaConstraint,
  SchemaIndex,
  SchemaPolicy,
  TableSummary,
  DescribeResult,
  RelatedResult,
  FindColumnsResult,
  FindCommonColumnsResult,
  JoinPathResult,
  SearchSchemaResult,
  SearchSchemaMatch,
  FindByTypeResult,
  FindPolymorphicResult,
  CheckIndexResult,
  FindOrphansResult,
  EnumDef,
  IncludeSection,
} from "./types.js";

// --------------- Helpers ---------------

/** Resolve a possibly-bare table name to "schema.table" */
function resolveKey(name: string, defaultSchema = "public"): string {
  return name.includes(".") ? name : `${defaultSchema}.${name}`;
}

function tableNotFound(name: string): never {
  throw new Error(
    `Table "${name}" not found in schema snapshot.\n` +
      `Tip: run 'dbctx tables' to see available tables.`
  );
}

// --------------- listTables ---------------

export interface ListTablesResult {
  tables: TableSummary[];
  total: number;
}

/**
 * Returns all tables/views in the snapshot, optionally filtered by a
 * case-insensitive substring or regex pattern applied to the table name.
 */
export function listTables(
  schema: NormalizedSchema,
  filter?: string
): ListTablesResult {
  const entries = Object.entries(schema.tables);
  const filtered = filter
    ? entries.filter(([key]) => {
        try {
          return new RegExp(filter, "i").test(key);
        } catch {
          return key.toLowerCase().includes(filter.toLowerCase());
        }
      })
    : entries;

  const tables: TableSummary[] = filtered.map(([name, t]) => ({
    name,
    type: t.type,
    comment: t.comment,
  }));

  return { tables, total: tables.length };
}

// --------------- describe ---------------

/**
 * Returns selected sections of one or more tables in a single call.
 * include defaults to all sections if not specified.
 */
export function describe(
  schema: NormalizedSchema,
  tableNames: string[],
  include?: IncludeSection[]
): DescribeResult {
  const all: IncludeSection[] = [
    "columns",
    "constraints",
    "indexes",
    "fks",
    "policies",
    "triggers",
  ];
  const sections = new Set(include ?? all);

  const result: DescribeResult = { tables: {} };

  for (const rawName of tableNames) {
    const key = resolveKey(rawName);
    const table = schema.tables[key];
    if (!table) tableNotFound(rawName);

    const partial: Partial<SchemaTable> = {
      type: table.type,
      schema: table.schema,
      comment: table.comment,
      rlsEnabled: table.rlsEnabled,
      rlsForced: table.rlsForced,
    };

    if (sections.has("columns")) partial.columns = table.columns;
    if (sections.has("constraints") || sections.has("fks")) {
      // "fks" is a shorthand — include FK constraints only when "fks" requested
      // without full "constraints"
      if (sections.has("constraints")) {
        partial.constraints = table.constraints;
      } else {
        // "fks" only
        partial.constraints = table.constraints.filter(
          (c) => c.type === "FOREIGN KEY"
        );
      }
    }
    if (sections.has("indexes")) partial.indexes = table.indexes;
    if (sections.has("triggers")) partial.triggers = table.triggers;
    if (sections.has("policies")) partial.policies = table.policies;

    result.tables[key] = partial;
  }

  return result;
}

// --------------- getTableSchema ---------------

/** Full detail for one table. */
export function getTableSchema(
  schema: NormalizedSchema,
  tableName: string
): SchemaTable {
  const key = resolveKey(tableName);
  const table = schema.tables[key];
  if (!table) tableNotFound(tableName);
  return table;
}

// --------------- getColumns ---------------

export function getColumns(
  schema: NormalizedSchema,
  tableName: string
): SchemaColumn[] {
  return getTableSchema(schema, tableName).columns;
}

// --------------- getColumnConstraints ---------------

/**
 * Returns constraints that touch any of the requested columns.
 * Great for validation — agent asks "what are the rules on col a and col b?"
 */
export function getColumnConstraints(
  schema: NormalizedSchema,
  tableName: string,
  columns: string[]
): SchemaConstraint[] {
  const table = getTableSchema(schema, tableName);
  const colSet = new Set(columns);
  return table.constraints.filter((c) =>
    c.columns.some((col) => colSet.has(col))
  );
}

// --------------- related ---------------

/**
 * BFS over the FK graph returning all tables connected to the root
 * within the given depth (default 1 = direct neighbors).
 * Returns both directions (references + referencedBy).
 */
export function related(
  schema: NormalizedSchema,
  tableName: string,
  depth = 1
): RelatedResult {
  const rootKey = resolveKey(tableName);
  if (!schema.tables[rootKey]) tableNotFound(tableName);

  const visited = new Set<string>([rootKey]);
  const edges: RelatedResult["edges"] = [];
  let frontier = [rootKey];

  for (let d = 0; d < depth; d++) {
    const nextFrontier: string[] = [];

    for (const fromKey of frontier) {
      const rel = schema.relations[fromKey];
      if (!rel) continue;

      // Outgoing FKs (references)
      for (const toKey of rel.references) {
        // Find the FK columns from the actual constraint
        const fkCols = schema.tables[fromKey]?.constraints
          .filter(
            (c) => c.type === "FOREIGN KEY" && c.references?.table === toKey
          )
          .flatMap((c) => c.columns) ?? [];

        if (!visited.has(toKey)) {
          visited.add(toKey);
          nextFrontier.push(toKey);
        }
        if (!edges.some((e) => e.from === fromKey && e.to === toKey)) {
          edges.push({ from: fromKey, to: toKey, via: fkCols });
        }
      }

      // Incoming FKs (referencedBy)
      for (const fromRef of rel.referencedBy) {
        const fkCols = schema.tables[fromRef]?.constraints
          .filter(
            (c) => c.type === "FOREIGN KEY" && c.references?.table === fromKey
          )
          .flatMap((c) => c.columns) ?? [];

        if (!visited.has(fromRef)) {
          visited.add(fromRef);
          nextFrontier.push(fromRef);
        }
        if (!edges.some((e) => e.from === fromRef && e.to === fromKey)) {
          edges.push({ from: fromRef, to: fromKey, via: fkCols });
        }
      }
    }

    frontier = nextFrontier;
    if (frontier.length === 0) break;
  }

  const nodes = [...visited].filter((k) => k !== rootKey);

  return { root: rootKey, depth, nodes, edges };
}

// --------------- findColumns ---------------

/**
 * Search all tables for columns matching a name pattern (case-insensitive
 * substring or regex).
 */
export function findColumns(
  schema: NormalizedSchema,
  pattern: string
): FindColumnsResult {
  let regex: RegExp;
  try {
    regex = new RegExp(pattern, "i");
  } catch {
    regex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  }

  const matches: FindColumnsResult["matches"] = [];

  for (const [tableName, table] of Object.entries(schema.tables)) {
    for (const col of table.columns) {
      if (regex.test(col.name)) {
        matches.push({ table: tableName, column: col });
      }
    }
  }

  return { pattern, matches };
}

// --------------- findCommonColumns ---------------

/**
 * Finds columns that exist in ALL of the provided tables.
 * Optionally filters by a pattern (substring or regex).
 */
export function findCommonColumns(
  schema: NormalizedSchema,
  tableNames: string[],
  pattern?: string
): FindCommonColumnsResult {
  if (tableNames.length === 0) {
    const res: FindCommonColumnsResult = { tables: [], columns: [] };
    if (pattern !== undefined) res.pattern = pattern;
    return res;
  }

  let regex: RegExp | undefined;
  if (pattern) {
    try {
      regex = new RegExp(pattern, "i");
    } catch {
      regex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    }
  }

  // Get columns for each table
  const tableColumns = tableNames.map(rawName => {
    const key = resolveKey(rawName);
    const table = schema.tables[key];
    if (!table) tableNotFound(rawName);
    return {
      key,
      columns: new Set(table.columns.map(c => c.name))
    };
  });

  // Start with the columns of the first table
  let common = new Set(tableColumns[0]!.columns);

  // Intersect with remaining tables
  for (let i = 1; i < tableColumns.length; i++) {
    const nextSet = tableColumns[i]!.columns;
    const intersection = new Set<string>();
    for (const col of common) {
      if (nextSet.has(col)) {
        intersection.add(col);
      }
    }
    common = intersection;
  }

  // Filter by pattern if provided
  let resultCols = Array.from(common);
  if (regex) {
    resultCols = resultCols.filter(c => regex!.test(c));
  }

  const result: FindCommonColumnsResult = { 
    tables: tableColumns.map(tc => tc.key), 
    columns: resultCols.sort() 
  };
  if (pattern !== undefined) result.pattern = pattern;
  
  return result;
}

// --------------- joinPath ---------------

/**
 * BFS shortest FK path between two tables.
 * Returns null path if no FK path exists.
 */
export function joinPath(
  schema: NormalizedSchema,
  fromName: string,
  toName: string
): JoinPathResult {
  const fromKey = resolveKey(fromName);
  const toKey = resolveKey(toName);

  if (!schema.tables[fromKey]) tableNotFound(fromName);
  if (!schema.tables[toKey]) tableNotFound(toName);

  if (fromKey === toKey) {
    return { from: fromKey, to: toKey, path: [fromKey], edges: [] };
  }

  // BFS with parent tracking
  const parentMap = new Map<string, string>();
  const edgeMap = new Map<string, { from: string; to: string; via: string[] }>();
  const queue = [fromKey];
  const visited = new Set<string>([fromKey]);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const rel = schema.relations[current];
    if (!rel) continue;

    const neighbors = [...rel.references, ...rel.referencedBy];

    for (const neighbor of neighbors) {
      if (visited.has(neighbor)) continue;
      visited.add(neighbor);
      parentMap.set(neighbor, current);

      // Determine edge direction and FK columns
      let fkCols: string[];
      let edgeFrom: string;
      let edgeTo: string;

      if (rel.references.includes(neighbor)) {
        edgeFrom = current;
        edgeTo = neighbor;
        fkCols = schema.tables[current]?.constraints
          .filter(
            (c) => c.type === "FOREIGN KEY" && c.references?.table === neighbor
          )
          .flatMap((c) => c.columns) ?? [];
      } else {
        edgeFrom = neighbor;
        edgeTo = current;
        fkCols = schema.tables[neighbor]?.constraints
          .filter(
            (c) => c.type === "FOREIGN KEY" && c.references?.table === current
          )
          .flatMap((c) => c.columns) ?? [];
      }

      edgeMap.set(`${edgeFrom}→${edgeTo}`, {
        from: edgeFrom,
        to: edgeTo,
        via: fkCols,
      });

      if (neighbor === toKey) {
        // Reconstruct path
        const path: string[] = [];
        let node: string | undefined = toKey;
        while (node) {
          path.unshift(node);
          node = parentMap.get(node);
        }

        // Reconstruct edges along path
        const edges: RelatedResult["edges"] = [];
        for (let i = 0; i < path.length - 1; i++) {
          const a = path[i]!;
          const b = path[i + 1]!;
          const e =
            edgeMap.get(`${a}→${b}`) ?? edgeMap.get(`${b}→${a}`);
          if (e) edges.push(e);
        }

        return { from: fromKey, to: toKey, path, edges };
      }

      queue.push(neighbor);
    }
  }

  // No path found
  return { from: fromKey, to: toKey, path: null, edges: [] };
}

// --------------- getEnums ---------------

export interface GetEnumsResult {
  enums: Record<string, EnumDef>;
}

export function getEnums(
  schema: NormalizedSchema,
  name?: string
): GetEnumsResult {
  if (!name) {
    return { enums: schema.enums };
  }
  const pattern = name.includes(".") ? name : `public.${name}`;
  const filtered = Object.fromEntries(
    Object.entries(schema.enums).filter(
      ([key]) =>
        key === pattern ||
        key.endsWith(`.${pattern}`) ||
        key.toLowerCase().includes(name.toLowerCase())
    )
  );
  return { enums: filtered };
}

// --------------- getPolicies ---------------

export interface GetPoliciesResult {
  policies: Array<{ table: string; policy: SchemaPolicy }>;
}

export function getPolicies(
  schema: NormalizedSchema,
  tableName?: string
): GetPoliciesResult {
  const results: GetPoliciesResult["policies"] = [];

  if (tableName) {
    const key = resolveKey(tableName);
    const table = schema.tables[key];
    if (!table) tableNotFound(tableName);
    for (const pol of table.policies) {
      results.push({ table: key, policy: pol });
    }
  } else {
    for (const [key, table] of Object.entries(schema.tables)) {
      for (const pol of table.policies) {
        results.push({ table: key, policy: pol });
      }
    }
  }

  return { policies: results };
}

// --------------- status ---------------

import type { Fingerprint, StatusResult } from "./types.js";

export function buildStatus(
  connectionId: string,
  fingerprint: Fingerprint | null,
  schema: NormalizedSchema | null,
  dbReachable: boolean
): StatusResult {
  let snapshotAge: string | null = null;

  if (fingerprint) {
    const ageMs = Date.now() - new Date(fingerprint.verifiedAt).getTime();
    const ageSec = Math.floor(ageMs / 1000);

    if (ageSec < 60) snapshotAge = `${ageSec}s ago`;
    else if (ageSec < 3600) snapshotAge = `${Math.floor(ageSec / 60)}m ago`;
    else snapshotAge = `${Math.floor(ageSec / 3600)}h ago`;
  }

  return {
    connectionId,
    snapshotAge,
    verifiedAt: fingerprint?.verifiedAt ?? null,
    dbReachable,
    tableCount: schema ? Object.keys(schema.tables).length : null,
    stale: fingerprint !== null && !dbReachable,
  };
}

// --------------- searchSchema ---------------

export function searchSchema(
  schema: NormalizedSchema,
  keyword: string
): SearchSchemaResult {
  const matches: SearchSchemaMatch[] = [];
  let regex: RegExp;
  try {
    regex = new RegExp(keyword, "i");
  } catch {
    regex = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  }

  const pushMatch = (
    type: "table" | "column" | "enum",
    location: string,
    name: string,
    comment: string | null | undefined,
    matchReason: string
  ) => {
    matches.push({ type, location, name, comment, matchReason });
  };

  // Search tables and their columns
  for (const [tableName, table] of Object.entries(schema.tables)) {
    if (regex.test(tableName)) {
      pushMatch("table", tableName, tableName, table.comment, "Table name matched");
    } else if (table.comment && regex.test(table.comment)) {
      pushMatch("table", tableName, tableName, table.comment, "Table comment matched");
    }

    for (const col of table.columns) {
      if (regex.test(col.name)) {
        pushMatch("column", `${tableName}.${col.name}`, col.name, col.comment, "Column name matched");
      } else if (col.comment && regex.test(col.comment)) {
        pushMatch("column", `${tableName}.${col.name}`, col.name, col.comment, "Column comment matched");
      }
    }
  }

  // Search enums
  for (const [enumName, enumDef] of Object.entries(schema.enums)) {
    if (regex.test(enumName)) {
      pushMatch("enum", enumName, enumName, null, "Enum name matched");
    } else {
      for (const val of enumDef.values) {
        if (regex.test(val)) {
          pushMatch("enum", enumName, enumName, null, `Enum value matched: ${val}`);
          break; // only push the enum once
        }
      }
    }
  }

  return { keyword, matches };
}

// --------------- findByType ---------------

export function findByType(
  schema: NormalizedSchema,
  typeKeyword: string
): FindByTypeResult {
  const matches: FindByTypeResult["matches"] = [];
  const keywordLower = typeKeyword.toLowerCase();

  for (const [tableName, table] of Object.entries(schema.tables)) {
    for (const col of table.columns) {
      if (col.type.toLowerCase().includes(keywordLower)) {
        matches.push({ table: tableName, column: col });
      }
    }
  }

  return { type: typeKeyword, matches };
}

// --------------- findPolymorphic ---------------

export function findPolymorphic(
  schema: NormalizedSchema
): FindPolymorphicResult {
  const matches: FindPolymorphicResult["matches"] = [];

  for (const [tableName, table] of Object.entries(schema.tables)) {
    const colNames = new Set(table.columns.map(c => c.name));
    
    for (const colName of colNames) {
      if (colName.endsWith("_type")) {
        const prefix = colName.slice(0, -5); // remove "_type"
        if (colNames.has(`${prefix}_id`)) {
          matches.push({
            table: tableName,
            typeColumn: colName,
            idColumn: `${prefix}_id`
          });
        }
      }
    }
  }

  return { matches };
}

// --------------- checkIndex ---------------

export function checkIndex(
  schema: NormalizedSchema,
  tableName: string,
  columns: string[]
): CheckIndexResult {
  const table = getTableSchema(schema, tableName);
  const targetCols = columns.map(c => c.toLowerCase());
  
  let coveringIndex: SchemaIndex | undefined;
  const partialMatches: SchemaIndex[] = [];

  for (const idx of table.indexes) {
    const idxCols = idx.columns.map(c => c.toLowerCase());
    
    // Check if index covers all requested columns in order
    // A covering index needs the query columns to be a prefix of the index columns
    let isCovering = true;
    if (targetCols.length > idxCols.length) {
      isCovering = false;
    } else {
      for (let i = 0; i < targetCols.length; i++) {
        if (targetCols[i] !== idxCols[i]) {
          isCovering = false;
          break;
        }
      }
    }

    if (isCovering) {
      coveringIndex = idx;
      break; // Found the best possible match
    }
    
    // Check for partial match (e.g. index contains at least the first queried column)
    if (idxCols[0] === targetCols[0]) {
      partialMatches.push(idx);
    }
  }

  return {
    table: tableName,
    columns,
    covered: !!coveringIndex,
    coveringIndex,
    partialMatches
  };
}

// --------------- findOrphans ---------------

export function findOrphans(
  schema: NormalizedSchema
): FindOrphansResult {
  const orphans: string[] = [];

  for (const [tableName, rel] of Object.entries(schema.relations)) {
    if (rel.references.length === 0 && rel.referencedBy.length === 0) {
      // It has no incoming or outgoing relations in the relation graph
      // Make sure it is an actual table
      if (schema.tables[tableName]) {
        orphans.push(tableName);
      }
    }
  }

  return { orphans };
}
