/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// Enumerates the TypeScript entry points of every `@freelensapp/*` workspace
// package as (specifier, sourcePath) pairs, e.g.
// ("@freelensapp/core/main", "<repo>/packages/core/src/main/library.ts").
//
// The d.ts build uses this twice with the same data so the two stay in sync:
// - `generate-dts-tsconfig.mjs` turns it into tsconfig `paths`, which makes
//   the workspace sources part of the tsc program (module resolution through
//   node_modules would mark them external and skip declaration emit).
// - `rollup.dts.config.mjs` turns it into aliases from the bare specifiers
//   kept in the emitted declarations to the emitted `.d.ts` files.

import { globSync, readFileSync } from "node:fs";
import path from "node:path";

export const enumerateWorkspaceEntries = (repoRoot) => {
  const entries = new Map();

  const addEntry = (specifier, packageDir, target) => {
    if (typeof target !== "string" || !/\.tsx?$/.test(target)) {
      return;
    }

    entries.set(specifier, path.resolve(packageDir, target));
  };

  const manifestPaths = globSync("packages/**/package.json", {
    cwd: repoRoot,
    exclude: (fileName) => fileName.includes("node_modules") || fileName.includes("dist"),
  });

  for (const manifestPath of manifestPaths) {
    const packageDir = path.join(repoRoot, path.dirname(manifestPath));
    const manifest = JSON.parse(readFileSync(path.join(repoRoot, manifestPath), "utf8"));

    if (!manifest.name?.startsWith("@freelensapp/") || manifest.name === "@freelensapp/extensions") {
      continue;
    }

    if (manifest.exports) {
      for (const [subpath, value] of Object.entries(manifest.exports)) {
        const target = typeof value === "string" ? value : (value?.types ?? value?.import ?? value?.default);

        addEntry(path.posix.join(manifest.name, subpath), packageDir, target);
      }
    }

    addEntry(manifest.name, packageDir, manifest.types ?? manifest.main);
  }

  return entries;
};
