#!/usr/bin/env node
// Freelens v2 — Phase 3 codemod: ESM flip (plan D2/D3).
//
// Sets `"type": "module"` on the application manifest (freelens/package.json)
// and on every `@freelensapp/*` workspace package under packages/, so the whole
// workspace ships as ES modules. Any explicit `"type": "commonjs"` is replaced.
//
// The `"type"` key is inserted right after `"license"` when present (matching
// the field order the repo already uses), otherwise appended.
//
// The script is idempotent and prints a dry-run report by default. Pass
// `--write` to apply the changes.
//
// NOT done here (behaviour-bearing, needs a real Electron run — Phase 3's bar is
// still "an app that boots", which a headless CI runner cannot verify):
//
//   - freelens/electron.vite.config.ts main output is flipped to ESM separately
//     (formats: ["es"]).
//   - extension-loader.ts must move from `require(path)` to
//     `await import(pathToFileURL(path))` (D2) — a sync->async change that
//     ripples through loadUserExtensions(); left for local iteration.
//   - Monaco json+yaml module workers via MonacoEnvironment.getWorker (D11).
//   - The coexisting webpack build and its CommonJS `.js`/ts-node configs break
//     under `"type": "module"`; they are deleted in Phase 5. This is why the
//     flip lands on `v2` where CI red is allowed (D9), not on `main`.
//
// Usage:
//   node scripts/v2-phase-3-esm-flip.mjs            # dry run
//   node scripts/v2-phase-3-esm-flip.mjs --write     # apply

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const write = process.argv.includes("--write");

/** Recursively collect package.json paths under a dir, skipping node_modules and dist. */
function findPackageJsons(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "dist") continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      findPackageJsons(full, acc);
    } else if (entry.name === "package.json") {
      acc.push(full);
    }
  }
  return acc;
}

/** Set pkg.type to "module", inserting after "license" to keep the repo's field order. */
function setTypeModule(pkg) {
  if (pkg.type === "module") return pkg;

  const rebuilt = {};
  let inserted = false;
  for (const [key, value] of Object.entries(pkg)) {
    if (key === "type") continue; // drop an existing "commonjs"; re-added below
    rebuilt[key] = value;
    if (key === "license") {
      rebuilt.type = "module";
      inserted = true;
    }
  }
  if (!inserted) rebuilt.type = "module";
  return rebuilt;
}

const targets = [join(repoRoot, "freelens", "package.json"), ...findPackageJsons(join(repoRoot, "packages"))];

const changed = [];

for (const pkgPath of targets) {
  const raw = readFileSync(pkgPath, "utf8");
  const pkg = JSON.parse(raw);

  if (pkg.type === "module") continue;

  const rebuilt = setTypeModule(pkg);
  changed.push(relative(repoRoot, pkgPath));
  if (write) writeFileSync(pkgPath, `${JSON.stringify(rebuilt, null, 2)}\n`);
}

const mode = write ? "applied" : "dry run (pass --write to apply)";
console.log(`Phase 3 ESM-flip codemod — ${mode}`);
console.log(`${changed.length} package(s) ${write ? "updated" : "would change"}:`);
for (const p of changed) console.log(`  ${p}`);
