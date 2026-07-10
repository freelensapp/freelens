/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// Writes tsconfig.typecheck.generated.json: a solution-wide `tsc --noEmit`
// program covering every workspace package (sources and tests) plus the
// freelens application sources. Like the extension-api d.ts build, it maps
// every `@freelensapp/*` entry point to its TypeScript source through
// `paths`: resolution through node_modules symlinks would mark those files
// external library files and skip checking them.

import { writeFileSync } from "node:fs";
import path from "node:path";
import { enumerateWorkspaceEntries } from "../packages/extensions/scripts/workspace-entries.mjs";

const repoRoot = path.resolve(import.meta.dirname, "..");

const paths = {};

for (const [specifier, sourcePath] of enumerateWorkspaceEntries(repoRoot)) {
  paths[specifier] = [`./${path.relative(repoRoot, sourcePath)}`];
}

// The workspace consumes @freelensapp/extensions from its TypeScript source
// entry; the enumeration excludes it because the d.ts build treats it as the
// program root rather than a dependency.
paths["@freelensapp/extensions"] = ["./packages/extensions/src/extension-api.ts"];

const tsconfig = {
  extends: "./tsconfig.json",
  compilerOptions: {
    moduleResolution: "Bundler",
    module: "ESNext",
    noEmit: true,
    baseUrl: ".",
    paths,
    types: ["node", "vitest/globals"],
  },
  include: ["packages/**/*.ts", "packages/**/*.tsx", "packages/core/types/*.d.ts", "freelens/src/**/*"],
  exclude: ["**/node_modules/**", "**/dist/**", "**/dist-types/**", "**/static/**", "**/binaries/**"],
};

writeFileSync(path.join(repoRoot, "tsconfig.typecheck.generated.json"), `${JSON.stringify(tsconfig, null, 2)}\n`);

console.log(`tsconfig.typecheck.generated.json written (${Object.keys(paths).length} workspace entries)`);
