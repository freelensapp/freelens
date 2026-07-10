/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// Compiles the runtime shim (src/extension-api.ts) to a single ESM file in
// dist/. The shim only re-exports `globalThis.FreelensExtensionApi`; its
// imports are type-only and are elided by the transpile, so the emitted file
// has no runtime dependencies.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

const packageRoot = path.resolve(import.meta.dirname, "..");
const source = readFileSync(path.join(packageRoot, "src/extension-api.ts"), "utf8");

const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
});

mkdirSync(path.join(packageRoot, "dist"), { recursive: true });
writeFileSync(path.join(packageRoot, "dist/extension-api.js"), outputText);

console.log("dist/extension-api.js written");
