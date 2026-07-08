#!/usr/bin/env node
// Freelens v2 — Phase 2 codemod: source-only workspace packages (plan D3).
//
// Rewrites every built `@freelensapp/*` workspace package (those whose build
// script is `lens-webpack-build`) so it is consumed directly from TypeScript
// source instead of a transpiled `dist/`:
//
//   - `main`  / `types` / `module` -> ./src/index.ts
//   - exports["."]                 -> ./src/index.ts
//   - exports["./styles"]          -> the single ./src/<name>.scss source
//   - drop the `build` / `build:dev` scripts (there is no build step anymore)
//   - drop `"files": ["dist"]`     (nothing is emitted to dist)
//
// The script is idempotent and prints a dry-run report by default. Pass
// `--write` to apply the changes. It intentionally does NOT touch:
//
//   - packages/core and packages/extensions (webpack library bundles; handled
//     separately in Phase 2/Phase 5, see docs/v2-plan.md D3/§4)
//   - packages/transpilation/* (deletion + import-site repointing is a
//     separate, behaviour-bearing step — the node-fetch shim augments the
//     default export, so it cannot be removed by a blind rename)
//
// Usage:
//   node scripts/v2-phase-2-source-only.mjs           # dry run
//   node scripts/v2-phase-2-source-only.mjs --write    # apply

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const write = process.argv.includes("--write");

// Packages excluded from the automated codemod (special-cased elsewhere).
const EXCLUDED = new Set(["@freelensapp/core", "@freelensapp/extensions"]);

const SOURCE_ENTRY = "./src/index.ts";

/** Recursively collect package.json paths under packages/, skipping node_modules and dist. */
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

/** Find the single top-level `src/*.scss` file for a package, or null. */
function findStylesSource(pkgDir) {
  const srcDir = join(pkgDir, "src");
  if (!existsSync(srcDir) || !statSync(srcDir).isDirectory()) return null;
  const scss = readdirSync(srcDir).filter((f) => f.endsWith(".scss"));
  return scss.length === 1 ? `./src/${scss[0]}` : null;
}

/** Rewrite an exports value that pointed at `./dist/index.js` to the source entry. */
function rewriteDotExport(value) {
  if (typeof value === "string") return SOURCE_ENTRY;
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = typeof v === "string" ? SOURCE_ENTRY : v;
    }
    return out;
  }
  return value;
}

const changed = [];
const skippedStyles = [];

for (const pkgPath of findPackageJsons(join(repoRoot, "packages"))) {
  const raw = readFileSync(pkgPath, "utf8");
  const pkg = JSON.parse(raw);

  const isBuilt = pkg.scripts && pkg.scripts.build === "lens-webpack-build";
  if (!isBuilt || EXCLUDED.has(pkg.name)) continue;

  const pkgDir = dirname(pkgPath);
  const before = JSON.stringify(pkg);

  if (pkg.main) pkg.main = SOURCE_ENTRY;
  if (pkg.types) pkg.types = SOURCE_ENTRY;
  if (pkg.module) pkg.module = SOURCE_ENTRY;

  if (pkg.exports && typeof pkg.exports === "object") {
    for (const [key, value] of Object.entries(pkg.exports)) {
      if (key === ".") {
        pkg.exports[key] = rewriteDotExport(value);
      } else if (key === "./styles") {
        const stylesSource = findStylesSource(pkgDir);
        if (stylesSource) {
          pkg.exports[key] = stylesSource;
        } else {
          skippedStyles.push(pkg.name);
        }
      }
    }
  }

  if (pkg.scripts) {
    delete pkg.scripts.build;
    delete pkg.scripts["build:dev"];
  }

  if (Array.isArray(pkg.files)) {
    pkg.files = pkg.files.filter((f) => f !== "dist");
    if (pkg.files.length === 0) delete pkg.files;
  }

  if (JSON.stringify(pkg) === before) continue;

  changed.push(relative(repoRoot, pkgPath));
  if (write) writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
}

const mode = write ? "applied" : "dry run (pass --write to apply)";
console.log(`Phase 2 source-only codemod — ${mode}`);
console.log(`${changed.length} package(s) ${write ? "updated" : "would change"}:`);
for (const p of changed) console.log(`  ${p}`);
if (skippedStyles.length) {
  console.log(`\nWARNING: could not resolve a single ./src/*.scss for ./styles in:`);
  for (const p of skippedStyles) console.log(`  ${p} (leave ./styles manually)`);
}
