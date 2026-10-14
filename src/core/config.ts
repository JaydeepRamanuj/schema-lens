// ============================================================
// config.ts — loads and validates dbctx.config.json.
// Resolution order: --url flag > DBCTX_URL env > named profile.
// ============================================================

import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

// --------------- Zod schema ---------------

const ProfileSchema = z.object({
  url: z.string().min(1),
  schemas: z.array(z.string()).min(1).default(["public"]),
  comment: z.string().optional(),
});

const ConfigSchema = z.object({
  default: z.string().default("default"),
  ttlSeconds: z.number().int().nonnegative().default(5),
  defaultFormat: z.enum(["json", "md", "compact"]).default("compact"),
  profiles: z.record(z.string(), ProfileSchema).default({}),
});

// --------------- Exported types ---------------

export type DbctxProfile = z.infer<typeof ProfileSchema>;
export type DbctxConfig = z.infer<typeof ConfigSchema>;

// --------------- Config loader ---------------

let _cached: DbctxConfig | null = null;

function findConfigPath(): string | null {
  // Support DBCTX_CONFIG env override
  const envPath = process.env["DBCTX_CONFIG"];
  if (envPath && fs.existsSync(envPath)) return envPath;

  // Walk up from CWD looking for dbctx.config.json
  let dir = process.cwd();
  while (true) {
    const candidate = path.join(dir, "dbctx.config.json");
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break; // reached root
    dir = parent;
  }
  return null;
}

export function loadConfig(): DbctxConfig {
  if (_cached) return _cached;

  const configPath = findConfigPath();
  if (!configPath) {
    // Return a minimal valid config when no file exists (URL-only mode)
    _cached = ConfigSchema.parse({});
    return _cached;
  }

  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch (err) {
    throw new Error(`Failed to parse ${configPath}: ${String(err)}`);
  }

  const result = ConfigSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(
      `Invalid dbctx.config.json:\n${result.error.issues
        .map((i) => `  ${i.path.join(".")}: ${i.message}`)
        .join("\n")}`
    );
  }

  _cached = result.data;
  return _cached;
}

// --------------- Connection resolution ---------------

export interface ResolvedConnection {
  url: string;
  schemas: string[];
  profileName: string;
}

export function resolveConnection(opts: {
  url?: string;
  name?: string;
}): ResolvedConnection {
  // 1. Explicit --url flag
  if (opts.url) {
    return { url: opts.url, schemas: ["public"], profileName: "_cli" };
  }

  // 2. DBCTX_URL environment variable
  const envUrl = process.env["DBCTX_URL"];
  if (envUrl) {
    return { url: envUrl, schemas: ["public"], profileName: "_env" };
  }

  // 3. Named profile in config
  const config = loadConfig();
  const profileName = opts.name ?? config.default;
  const profile = config.profiles[profileName];

  if (!profile) {
    throw new Error(
      `No profile "${profileName}" found in dbctx.config.json.\n` +
        `Available profiles: ${Object.keys(config.profiles).join(", ") || "(none)"}\n` +
        `Tip: pass --url or set DBCTX_URL to skip config.`
    );
  }

  return { url: profile.url, schemas: profile.schemas, profileName };
}

// Reset cache (used in tests)
export function _resetConfigCache(): void {
  _cached = null;
}
