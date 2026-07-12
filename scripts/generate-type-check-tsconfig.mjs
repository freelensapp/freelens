/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// Writes tsconfig.typecheck.generated.json: a solution-wide `tsc --noEmit`
// program covering every workspace package (sources and tests) plus the
// freelens application sources and its Playwright integration tests. Like
// the extension-api d.ts build, it maps
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
  // The root tsconfig.json is not extended: it declares baseUrl, which
  // TypeScript 7 (the checker this program runs under) removed. Its options
  // are inlined here instead; the ./-relative paths entries resolve against
  // the tsconfig directory without a baseUrl.
  compilerOptions: {
    jsx: "react",
    target: "ES2022",
    // The root tsconfig says ESNext, a moving target: under TypeScript 7 it
    // includes the ES2026 Map.getOrInsert proposal, which mobx's
    // ObservableMap does not implement, breaking their assignability. ES2024
    // is the documented floor (mobx needs its ReadonlySetLike).
    lib: ["ES2024", "DOM", "DOM.Iterable"],
    sourceMap: true,
    strict: true,
    noImplicitAny: true,
    noUnusedLocals: true,
    noImplicitReturns: true,
    experimentalDecorators: true,
    emitDecoratorMetadata: true,
    isolatedModules: true,
    skipLibCheck: true,
    allowJs: false,
    esModuleInterop: true,
    verbatimModuleSyntax: false,
    resolveJsonModule: true,
    useDefineForClassFields: true,
    moduleResolution: "Bundler",
    module: "ESNext",
    noEmit: true,
    paths,
    types: ["node", "vitest/globals"],
  },
  include: [
    "packages/**/*.ts",
    "packages/**/*.tsx",
    "packages/core/types/*.d.ts",
    "freelens/src/**/*",
    "freelens/integration/**/*.ts",
    "freelens/vitest.integration.config.ts",
  ],
  exclude: ["**/node_modules/**", "**/dist/**", "**/dist-types/**", "**/static/**", "**/binaries/**"],
};

writeFileSync(path.join(repoRoot, "tsconfig.typecheck.generated.json"), `${JSON.stringify(tsconfig, null, 2)}\n`);

console.log(`tsconfig.typecheck.generated.json written (${Object.keys(paths).length} workspace entries)`);
