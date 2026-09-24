/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// Writes tsconfig.api-extractor.generated.json: the compiler configuration
// API Extractor analyses `dist-types/packages/extensions/src/extension-api.d.ts`
// with.
//
// It is deliberately not `tsconfig.dts.generated.json`. That one maps every
// `@freelensapp/*` specifier to the package's **source**, because its job is to
// emit declarations for the whole reachable graph. API Extractor consumes those
// emitted declarations instead, so its `paths` point at `dist-types/**/*.d.ts` --
// the same mapping `rollup.dts.config.mjs` builds, and for the same reason: the
// emitted declarations keep bare workspace specifiers, and those packages are
// private, so they have to resolve inside the build output rather than through
// node_modules.
//
// Style and asset imports survive declaration emit as side-effect imports; they
// carry no types, and `asset-modules.d.ts` declares them away so the program is
// diagnostic-clean.

import { writeFileSync } from "node:fs";
import path from "node:path";
import { enumerateWorkspaceEntries } from "./workspace-entries.mjs";

const packageRoot = path.resolve(import.meta.dirname, "..");
const repoRoot = path.resolve(packageRoot, "../..");
const outRoot = path.join(packageRoot, "dist-types");

const paths = {};

for (const [specifier, sourcePath] of enumerateWorkspaceEntries(repoRoot)) {
  const emitted = path.join(outRoot, path.relative(repoRoot, sourcePath)).replace(/\.tsx?$/, ".d.ts");

  paths[specifier] = [`./${path.relative(packageRoot, emitted)}`];
}

const tsconfig = {
  extends: "./tsconfig.api-extractor.json",
  compilerOptions: {
    paths,
  },
};

writeFileSync(
  path.join(packageRoot, "tsconfig.api-extractor.generated.json"),
  `${JSON.stringify(tsconfig, null, 2)}\n`,
);

console.log(`tsconfig.api-extractor.generated.json written (${Object.keys(paths).length} workspace entries)`);
