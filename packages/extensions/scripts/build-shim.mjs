/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// Emits the runtime shim (src/runtime-shim.ts) as a single ESM file in dist/.
// The shim only re-exports `globalThis.FreelensExtensionApi`, so the emitted
// file has no runtime dependencies. The matching types are the d.ts rollup of
// src/extension-api.ts (see rollup.dts.config.mjs).
//
// The only TypeScript syntax in the shim is the two `!` non-null assertions, so
// a text substitution replaces them and `node --check` verifies that what was
// written still parses as an ES module.

import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const packageRoot = path.resolve(import.meta.dirname, "..");
const source = readFileSync(path.join(packageRoot, "src/runtime-shim.ts"), "utf8");

// `export const Main = api.Main!;` -> `export const Main = api.Main;`
const nonNullAssertion = /!;$/gm;
const expectedAssertions = 2;
const foundAssertions = source.match(nonNullAssertion)?.length ?? 0;

if (foundAssertions !== expectedAssertions) {
  throw new Error(
    `src/runtime-shim.ts: expected ${expectedAssertions} non-null assertions, found ${foundAssertions}. ` +
      "Update scripts/build-shim.mjs if the shim changed shape.",
  );
}

const outputPath = path.join(packageRoot, "dist/extension-api.js");

mkdirSync(path.join(packageRoot, "dist"), { recursive: true });
writeFileSync(outputPath, source.replace(nonNullAssertion, ";"));

const check = spawnSync(process.execPath, ["--check", outputPath], { stdio: "inherit" });

if (check.status !== 0) {
  throw new Error("dist/extension-api.js does not parse as an ES module; src/runtime-shim.ts uses unsupported syntax");
}

console.log("dist/extension-api.js written");
