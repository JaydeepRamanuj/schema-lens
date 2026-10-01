// ============================================================
// freshness.ts — fingerprint query + compare + TTL logic.
// Implements the full read flow from the spec (Section 4).
// ============================================================

import pg from "pg";
import type { Fingerprint, FreshnessResult } from "./types.js";

// --------------- Fingerprint SQL ---------------
// Returns one row per table with an MD5 hash covering:
//   columns (attnum, name, type, notnull, default)
//   constraints (name + pg_get_constraintdef)
//   indexes (pg_get_indexdef)
// Adapted from spec Section 9 with schema-list parameter.

const FINGERPRINT_SQL = `
SELECT
  n.nspname AS schema,
  c.relname AS name,
  md5(
    coalesce((
      SELECT string_agg(
               a.attnum || ':' || a.attname || ':' ||
               format_type(a.atttypid, a.atttypmod) || ':' ||
               a.attnotnull || ':' ||
               coalesce(pg_get_expr(d.adbin, d.adrelid), ''),
               ',' ORDER BY a.attnum)
      FROM pg_attribute a
      LEFT JOIN pg_attrdef d
             ON d.adrelid = a.attrelid AND d.adnum = a.attnum
      WHERE a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
    ), '')
    || '|' ||
    coalesce((
      SELECT string_agg(co.conname || ':' || pg_get_constraintdef(co.oid),
                        ',' ORDER BY co.conname)
      FROM pg_constraint co WHERE co.conrelid = c.oid
    ), '')
    || '|' ||
    coalesce((
      SELECT string_agg(pg_get_indexdef(i.indexrelid),
                        ',' ORDER BY i.indexrelid::regclass::text)
      FROM pg_index i WHERE i.indrelid = c.oid
    ), '')
  ) AS fingerprint
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind IN ('r', 'p', 'v', 'm', 'f')
  AND n.nspname = ANY($1)
ORDER BY 1, 2
`;

// Enum fingerprint: a single hash covering all enum types in the schema list
const ENUM_FINGERPRINT_SQL = `
SELECT md5(
  coalesce(
    string_agg(
      n.nspname || '.' || t.typname || ':' ||
      (SELECT string_agg(e.enumlabel, ',' ORDER BY e.enumsortorder)
       FROM pg_enum e WHERE e.enumtypid = t.oid),
      '|' ORDER BY n.nspname, t.typname
    ),
    ''
  )
) AS enums_hash
FROM pg_type t
JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE t.typtype = 'e'
  AND n.nspname = ANY($1)
`;

// --------------- Fingerprint query ---------------

interface FingerprintRow {
  schema: string;
  name: string;
  fingerprint: string;
}

interface EnumHashRow {
  enums_hash: string | null;
}

async function queryFingerprints(
  client: pg.Client,
  schemas: string[]
): Promise<{ tables: Record<string, string>; enumsHash: string }> {
  const [tableResult, enumResult] = await Promise.all([
    client.query<FingerprintRow>(FINGERPRINT_SQL, [schemas]),
    client.query<EnumHashRow>(ENUM_FINGERPRINT_SQL, [schemas]),
  ]);

  const tables: Record<string, string> = {};
  for (const row of tableResult.rows) {
    tables[`${row.schema}.${row.name}`] = row.fingerprint;
  }

  const enumsHash = enumResult.rows[0]?.enums_hash ?? "";

  return { tables, enumsHash };
}

// --------------- TTL check ---------------

function withinTtl(verifiedAt: string, ttlSeconds: number): boolean {
  const age = Date.now() - new Date(verifiedAt).getTime();
  return age < ttlSeconds * 1000;
}

// --------------- Main freshness check ---------------

export async function checkFreshness(
  client: pg.Client,
  schemas: string[],
  stored: Fingerprint | null,
  ttlSeconds: number
): Promise<{ result: FreshnessResult; newFingerprint: Fingerprint | null }> {
  // No stored fingerprint → first run, not fresh
  if (!stored) {
    return {
      result: {
        isFresh: false,
        changedTables: [],
        newTables: [],
        droppedTables: [],
        enumsChanged: false,
        wasDbUnreachable: false,
      },
      newFingerprint: null,
    };
  }

  // TTL short-circuit: if verified recently, skip the DB query
  if (withinTtl(stored.verifiedAt, ttlSeconds)) {
    return {
      result: {
        isFresh: true,
        changedTables: [],
        newTables: [],
        droppedTables: [],
        enumsChanged: false,
        wasDbUnreachable: false,
      },
      newFingerprint: null,
    };
  }

  // Query live fingerprints
  let live: { tables: Record<string, string>; enumsHash: string };
  try {
    live = await queryFingerprints(client, schemas);
  } catch {
    // DB unreachable — serve stale cache
    return {
      result: {
        isFresh: true, // serve cache
        changedTables: [],
        newTables: [],
        droppedTables: [],
        enumsChanged: false,
        wasDbUnreachable: true,
      },
      newFingerprint: null,
    };
  }

  // Compare hashes
  const storedKeys = new Set(Object.keys(stored.tables));
  const liveKeys = new Set(Object.keys(live.tables));

  const changedTables: string[] = [];
  const newTables: string[] = [];
  const droppedTables: string[] = [];

  for (const key of liveKeys) {
    if (!storedKeys.has(key)) {
      newTables.push(key);
    } else if (live.tables[key] !== stored.tables[key]?.hash) {
      changedTables.push(key);
    }
  }

  for (const key of storedKeys) {
    if (!liveKeys.has(key)) {
      droppedTables.push(key);
    }
  }

  const enumsChanged = live.enumsHash !== stored.enumsHash;
  const isFresh =
    changedTables.length === 0 &&
    newTables.length === 0 &&
    droppedTables.length === 0 &&
    !enumsChanged;

  // Build the new fingerprint to write back (updated verifiedAt even if no changes)
  const newFingerprint: Fingerprint = {
    tables: Object.fromEntries(
      Object.entries(live.tables).map(([k, v]) => [k, { hash: v }])
    ),
    enumsHash: live.enumsHash,
    verifiedAt: new Date().toISOString(),
  };

  return {
    result: {
      isFresh,
      changedTables,
      newTables,
      droppedTables,
      enumsChanged,
      wasDbUnreachable: false,
    },
    newFingerprint,
  };
}

// --------------- Build initial fingerprint from live DB ---------------

export async function buildFingerprint(
  client: pg.Client,
  schemas: string[]
): Promise<Fingerprint> {
  const live = await queryFingerprints(client, schemas);
  return {
    tables: Object.fromEntries(
      Object.entries(live.tables).map(([k, v]) => [k, { hash: v }])
    ),
    enumsHash: live.enumsHash,
    verifiedAt: new Date().toISOString(),
  };
}
