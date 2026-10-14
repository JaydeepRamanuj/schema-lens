// ============================================================
// scripts/check-pack.ts — fail if the npm tarball would ship anything
// outside the allowlist (RB-2 / QA-7). Run after `npm run build`:
//   npm run check:pack
// ============================================================

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

const ALLOWED_FILES = new Set([
  "package.json",
  "README.md",
  "LICENSE",
  "CHANGELOG.md",
  "dbctx.config.json.example",
]);
const ALLOWED_DIRS = ["skills/", "dist/"];
const FORBIDDEN_IN_DIST = /(^|\/)(test|tests|bench|benchmarks?)(\/|\.|$)/;

if (!existsSync("dist")) {
  console.error("check-pack: dist/ not found. Run `npm run build` first.");
  process.exit(1);
}

// --ignore-scripts keeps `prepare` output out of the JSON on stdout.
const out = execFileSync("npm", ["pack", "--dry-run", "--json", "--ignore-scripts"], {
  encoding: "utf8",
});
const [pack] = JSON.parse(out) as Array<{ files: Array<{ path: string }> }>;
const files = (pack?.files ?? []).map((f) => f.path).sort();

const problems: string[] = [];
for (const file of files) {
  if (ALLOWED_FILES.has(file)) continue;
  if (!ALLOWED_DIRS.some((dir) => file.startsWith(dir))) {
    problems.push(`not in allowlist: ${file}`);
  } else if (file.startsWith("dist/") && FORBIDDEN_IN_DIST.test(file.slice("dist/".length))) {
    problems.push(`test/bench path in dist: ${file}`);
  }
}
if (!files.some((f) => f.startsWith("dist/"))) problems.push("tarball contains no dist/ files");

if (problems.length > 0) {
  console.error(`check-pack: ${problems.length} problem(s) in npm tarball:`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}

console.log(`check-pack: OK (${files.length} files, all allowlisted)`);
