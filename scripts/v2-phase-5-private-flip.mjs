#!/usr/bin/env node
// Freelens v2 — Phase 5 codemod: flip internal packages to private (plan D4).
//
// Since v2 consumes every workspace package as TypeScript source and publishes
// exactly one package (@freelensapp/extensions), all other @freelensapp/*
// packages become `"private": true` so they are never published to npm.
//
// For each @freelensapp/* workspace package under packages/ (except
// @freelensapp/extensions) the script sets `"private": true`, replacing any
// existing `"private": false`. When the key is absent it is inserted right
// after `"version"` to match the repo's field order. The freelens application
// manifest is already private and is left untouched.
//
// The script is idempotent and prints a dry-run report by default. Pass
// `--write` to apply the changes.
//
// NOT done here (the rest of Phase 5 cleanup is behaviour-bearing and coupled
// to the electron-vite build reaching the "app that boots" bar, which a
// headless CI runner cannot verify — see docs/v2-plan.md §4 Phase 5):
//
//   - Delete freelens/webpack/, packages/core/webpack/,
//     packages/extensions/webpack/, packages/infrastructure/webpack and
//     repoint freelens/package.json scripts (build/dev/start) from webpack to
//     electron-vite.
//   - Prune @freelensapp/* from the electron-builder file lists.
//   - Drop the circular-dependency-plugin pnpm patch (patches/ +
//     pnpm-workspace.yaml) once webpack no longer consumes it.
//   - Decide Turbo's fate (removed or kept only as a script runner, D3).
//
// Usage:
//   node scripts/v2-phase-5-private-flip.mjs            # dry run
//   node scripts/v2-phase-5-private-flip.mjs --write     # apply

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const write = process.argv.includes("--write");

// The only package that stays publishable (plan D4/D5).
const PUBLISHED = "@freelensapp/extensions";

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

/** Set pkg.private to true, inserting after "version" to keep the repo's field order. */
function setPrivate(pkg) {
  if (pkg.private === true) return pkg;

  const rebuilt = {};
  let inserted = false;
  for (const [key, value] of Object.entries(pkg)) {
    if (key === "private") continue; // drop an existing "false"; re-added below
    rebuilt[key] = value;
    if (key === "version") {
      rebuilt.private = true;
      inserted = true;
    }
  }
  if (!inserted) rebuilt.private = true;
  return rebuilt;
}

const changed = [];

for (const pkgPath of findPackageJsons(join(repoRoot, "packages"))) {
  const raw = readFileSync(pkgPath, "utf8");
  const pkg = JSON.parse(raw);

  // Only touch @freelensapp/* workspace packages, and never the published one.
  if (!pkg.name?.startsWith("@freelensapp/")) continue;
  if (pkg.name === PUBLISHED) continue;
  if (pkg.private === true) continue;

  const rebuilt = setPrivate(pkg);
  changed.push(relative(repoRoot, pkgPath));
  if (write) writeFileSync(pkgPath, `${JSON.stringify(rebuilt, null, 2)}\n`);
}

const mode = write ? "applied" : "dry run (pass --write to apply)";
console.log(`Phase 5 private-flip codemod — ${mode}`);
console.log(`${changed.length} package(s) ${write ? "updated" : "would change"}:`);
for (const p of changed) console.log(`  ${p}`);
