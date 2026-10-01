// ============================================================
// store.ts — atomic read/write for .schema-cache/<connection-id>/
// Uses a PID-based lock file and .tmp → rename atomic writes.
// ============================================================

import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import type { NormalizedSchema, Fingerprint } from "./types.js";

// --------------- Path helpers ---------------

const CACHE_ROOT = ".schema-cache";

export function deriveConnectionId(dsn: string): string {
  // Extract host:port/dbname from DSN — never include credentials in the path
  try {
    const url = new URL(dsn);
    const parts = `${url.hostname}:${url.port || "5432"}${url.pathname}`;
    return crypto.createHash("md5").update(parts).digest("hex").slice(0, 16);
  } catch {
    // Fallback: hash the whole DSN (still no credentials in filesystem name)
    return crypto.createHash("md5").update(dsn).digest("hex").slice(0, 16);
  }
}

function cacheDir(connectionId: string): string {
  return path.join(process.cwd(), CACHE_ROOT, connectionId);
}

function schemaPath(connectionId: string): string {
  return path.join(cacheDir(connectionId), "schema.json");
}

function fingerprintPath(connectionId: string): string {
  return path.join(cacheDir(connectionId), "fingerprint.json");
}

function rawPath(connectionId: string): string {
  return path.join(cacheDir(connectionId), "raw");
}

function lockPath(connectionId: string): string {
  return path.join(cacheDir(connectionId), ".lock");
}

// --------------- Ensure directory exists ---------------

async function ensureDir(connectionId: string): Promise<void> {
  await fsPromises.mkdir(cacheDir(connectionId), { recursive: true });
  await fsPromises.mkdir(rawPath(connectionId), { recursive: true });
}

// --------------- Atomic write ---------------

async function writeAtomic(filePath: string, data: unknown): Promise<void> {
  const tmp = `${filePath}.tmp`;
  await fsPromises.writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
  await fsPromises.rename(tmp, filePath);
}

// --------------- Schema ---------------

export async function readSchema(
  connectionId: string
): Promise<NormalizedSchema | null> {
  const p = schemaPath(connectionId);
  if (!fs.existsSync(p)) return null;
  try {
    const raw = await fsPromises.readFile(p, "utf8");
    return JSON.parse(raw) as NormalizedSchema;
  } catch {
    return null;
  }
}

export async function writeSchema(
  connectionId: string,
  schema: NormalizedSchema
): Promise<void> {
  await ensureDir(connectionId);
  await writeAtomic(schemaPath(connectionId), schema);
}

// --------------- Fingerprint ---------------

export async function readFingerprint(
  connectionId: string
): Promise<Fingerprint | null> {
  const p = fingerprintPath(connectionId);
  if (!fs.existsSync(p)) return null;
  try {
    const raw = await fsPromises.readFile(p, "utf8");
    return JSON.parse(raw) as Fingerprint;
  } catch {
    return null;
  }
}

export async function writeFingerprint(
  connectionId: string,
  fp: Fingerprint
): Promise<void> {
  await ensureDir(connectionId);
  await writeAtomic(fingerprintPath(connectionId), fp);
}

// --------------- Raw debug output ---------------

export async function writeRaw(
  connectionId: string,
  data: unknown
): Promise<void> {
  await ensureDir(connectionId);
  await writeAtomic(
    path.join(rawPath(connectionId), "extract-debug.json"),
    data
  );
}

// --------------- Lock file ---------------

interface LockData {
  pid: number;
  startedAt: string;
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Acquires a lock for the given connection ID.
 * Returns a release function — always call it in a finally block.
 * Throws if another live process holds the lock.
 */
export async function acquireLock(
  connectionId: string
): Promise<() => Promise<void>> {
  await ensureDir(connectionId);
  const lp = lockPath(connectionId);

  if (fs.existsSync(lp)) {
    try {
      const existing = JSON.parse(
        fs.readFileSync(lp, "utf8")
      ) as LockData;
      if (isProcessAlive(existing.pid)) {
        throw new Error(
          `Another dbctx process (PID ${existing.pid}) is refreshing this schema. ` +
            `If that process crashed, delete ${lp} and retry.`
        );
      }
      // Stale lock — remove it
      fs.unlinkSync(lp);
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes("Another dbctx")) {
        throw err;
      }
      // JSON parse error or unlink error — remove and proceed
      try { fs.unlinkSync(lp); } catch { /* ignore */ }
    }
  }

  const lock: LockData = { pid: process.pid, startedAt: new Date().toISOString() };
  fs.writeFileSync(lp, JSON.stringify(lock), "utf8");

  return async () => {
    try {
      await fsPromises.unlink(lp);
    } catch {
      // Already removed — fine
    }
  };
}

// --------------- Store info ---------------

export interface StoreInfo {
  connectionId: string;
  cacheDir: string;
  hasSchema: boolean;
  hasFingerprint: boolean;
}

export async function getStoreInfo(connectionId: string): Promise<StoreInfo> {
  return {
    connectionId,
    cacheDir: cacheDir(connectionId),
    hasSchema: fs.existsSync(schemaPath(connectionId)),
    hasFingerprint: fs.existsSync(fingerprintPath(connectionId)),
  };
}
