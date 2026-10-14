// ============================================================
// store.ts — atomic read/write for .schema-cache/<connection-id>/
// Uses a PID-based lock file and .tmp → rename atomic writes.
// ============================================================

import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import os from "node:os";
import type { NormalizedSchema, Fingerprint } from "./types.js";

// --------------- Path helpers ---------------

const CACHE_ROOT = ".schema-cache";

export interface StoreOptions {
  isGlobal?: boolean | undefined;
}

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

function resolveCacheDir(connectionId: string, options?: StoreOptions): string {
  const localDir = path.join(process.cwd(), CACHE_ROOT, connectionId);
  const globalDir = path.join(os.homedir(), ".dbctx", "cache", connectionId);

  if (options?.isGlobal) {
    return globalDir;
  }

  if (fs.existsSync(localDir)) {
    return localDir;
  }
  if (fs.existsSync(globalDir)) {
    return globalDir;
  }

  return localDir;
}

function schemaPath(connectionId: string, options?: StoreOptions): string {
  return path.join(resolveCacheDir(connectionId, options), "schema.json");
}

function fingerprintPath(connectionId: string, options?: StoreOptions): string {
  return path.join(resolveCacheDir(connectionId, options), "fingerprint.json");
}

function rawPath(connectionId: string, options?: StoreOptions): string {
  return path.join(resolveCacheDir(connectionId, options), "raw");
}

function lockPath(connectionId: string, options?: StoreOptions): string {
  return path.join(resolveCacheDir(connectionId, options), ".lock");
}

// --------------- Ensure directory exists ---------------

async function ensureDir(connectionId: string, options?: StoreOptions): Promise<void> {
  await fsPromises.mkdir(resolveCacheDir(connectionId, options), { recursive: true });
  await fsPromises.mkdir(rawPath(connectionId, options), { recursive: true });
}

// --------------- Atomic write ---------------

async function writeAtomic(filePath: string, data: unknown): Promise<void> {
  const tmp = `${filePath}.tmp`;
  await fsPromises.writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
  await fsPromises.rename(tmp, filePath);
}

// --------------- Schema ---------------

export async function readSchema(
  connectionId: string,
  options?: StoreOptions
): Promise<NormalizedSchema | null> {
  const p = schemaPath(connectionId, options);
  if (!fs.existsSync(p)) return null;
  try {
    const raw = await fsPromises.readFile(p, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !parsed.meta || !parsed.meta.snapshotVersion) {
      return null;
    }
    return parsed as NormalizedSchema;
  } catch {
    return null;
  }
}

export async function writeSchema(
  connectionId: string,
  schema: NormalizedSchema,
  options?: StoreOptions
): Promise<void> {
  await ensureDir(connectionId, options);
  await writeAtomic(schemaPath(connectionId, options), schema);
}

// --------------- Fingerprint ---------------

export async function readFingerprint(
  connectionId: string,
  options?: StoreOptions
): Promise<Fingerprint | null> {
  const p = fingerprintPath(connectionId, options);
  if (!fs.existsSync(p)) return null;
  try {
    const raw = await fsPromises.readFile(p, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !parsed.verifiedAt) {
      return null;
    }
    return parsed as Fingerprint;
  } catch {
    return null;
  }
}

export async function writeFingerprint(
  connectionId: string,
  fp: Fingerprint,
  options?: StoreOptions
): Promise<void> {
  await ensureDir(connectionId, options);
  await writeAtomic(fingerprintPath(connectionId, options), fp);
}

// --------------- Raw debug output ---------------

export async function writeRaw(
  connectionId: string,
  data: unknown,
  options?: StoreOptions
): Promise<void> {
  await ensureDir(connectionId, options);
  await writeAtomic(
    path.join(rawPath(connectionId, options), "extract-debug.json"),
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
  connectionId: string,
  options?: StoreOptions
): Promise<() => Promise<void>> {
  await ensureDir(connectionId, options);
  const lp = lockPath(connectionId, options);

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

export async function getStoreInfo(connectionId: string, options?: StoreOptions): Promise<StoreInfo> {
  const dir = resolveCacheDir(connectionId, options);
  return {
    connectionId,
    cacheDir: dir,
    hasSchema: fs.existsSync(schemaPath(connectionId, options)),
    hasFingerprint: fs.existsSync(fingerprintPath(connectionId, options)),
  };
}
