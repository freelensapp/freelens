/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// Compiles the runtime shim (src/runtime-shim.ts) to a single ESM file in
// dist/. The shim only re-exports `globalThis.FreelensExtensionApi`, so the
// emitted file has no runtime dependencies. The matching types are the d.ts
// rollup of src/extension-api.ts (see rollup.dts.config.mjs).

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

const packageRoot = path.resolve(import.meta.dirname, "..");
const source = readFileSync(path.join(packageRoot, "src/runtime-shim.ts"), "utf8");

const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
});

mkdirSync(path.join(packageRoot, "dist"), { recursive: true });
writeFileSync(path.join(packageRoot, "dist/extension-api.js"), outputText);

console.log("dist/extension-api.js written");
