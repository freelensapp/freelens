/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// Writes tsconfig.dts.generated.json: tsconfig.dts.json plus a `paths` entry
// for every workspace package entry point. Resolving `@freelensapp/*` through
// `paths` (instead of node_modules symlinks) makes those sources part of the
// tsc program, so `tsc -p tsconfig.dts.generated.json` emits declarations for
// the whole reachable graph under dist-types/.

import { writeFileSync } from "node:fs";
import path from "node:path";
import { enumerateWorkspaceEntries } from "./workspace-entries.mjs";

const packageRoot = path.resolve(import.meta.dirname, "..");
const repoRoot = path.resolve(packageRoot, "../..");

const paths = {};

for (const [specifier, sourcePath] of enumerateWorkspaceEntries(repoRoot)) {
  paths[specifier] = [`./${path.relative(packageRoot, sourcePath)}`];
}

const tsconfig = {
  extends: "./tsconfig.dts.json",
  compilerOptions: {
    // paths values are ./-relative, so they resolve against this config's
    // directory without a baseUrl (removed: baseUrl is deprecated in TS6 and
    // dropped in TS7).
    paths,
  },
};

writeFileSync(path.join(packageRoot, "tsconfig.dts.generated.json"), `${JSON.stringify(tsconfig, null, 2)}\n`);

console.log(`tsconfig.dts.generated.json written (${Object.keys(paths).length} workspace entries)`);
