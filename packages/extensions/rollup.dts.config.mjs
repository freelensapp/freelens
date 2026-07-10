/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// Bundles the declaration tree emitted by `tsc -p tsconfig.dts.generated.json`
// (see `dist-types/`) into a single self-contained `dist/extension-api.d.ts`.
//
// The emitted declarations keep bare `@freelensapp/*` specifiers exactly as
// written in the sources. Those packages are private workspace packages in v2
// and must be inlined into the bundle, so this config maps every workspace
// package specifier (including subpath exports like `@freelensapp/core/main`)
// to its emitted `.d.ts` path. Anything else (react, mobx, electron, ...)
// stays an external type import.

import path from "node:path";
import dts from "rollup-plugin-dts";
import { enumerateWorkspaceEntries } from "./scripts/workspace-entries.mjs";

const packageRoot = import.meta.dirname;
const repoRoot = path.resolve(packageRoot, "../..");
const outRoot = path.join(packageRoot, "dist-types");

/** Maps a bare specifier ("@freelensapp/core/main") to an emitted .d.ts path. */
const workspaceAliases = new Map();

for (const [specifier, sourcePath] of enumerateWorkspaceEntries(repoRoot)) {
  workspaceAliases.set(specifier, path.join(outRoot, path.relative(repoRoot, sourcePath)).replace(/\.tsx?$/, ".d.ts"));
}

// Style and asset imports survive declaration emit as side-effect imports
// (e.g. `import "./components/app.scss"` in core's renderer library); they
// carry no types and are resolved to an empty module.
const assetModule = /\.(s?css|svg|png|jpg|ttf|woff2?|eot)$|\?(raw|worker)$/;
const emptyModuleId = "\0empty-asset-module";

const workspaceDtsAlias = {
  name: "workspace-dts-alias",

  resolveId(source) {
    const aliased = workspaceAliases.get(source);

    if (aliased) {
      return aliased;
    }

    if (assetModule.test(source)) {
      return emptyModuleId;
    }

    if (source.startsWith("@freelensapp/")) {
      this.warn(`no emitted declaration mapped for workspace specifier "${source}"; leaving it external`);
    }

    return null;
  },

  load(id) {
    if (id === emptyModuleId) {
      return "export {};";
    }

    return null;
  },
};

export default {
  input: path.join(outRoot, "packages/extensions/src/extension-api.d.ts"),
  output: {
    file: path.join(packageRoot, "dist/extension-api.d.ts"),
    format: "es",
  },
  external: (id) => !id.startsWith(".") && !path.isAbsolute(id) && !workspaceAliases.has(id),
  plugins: [workspaceDtsAlias, dts({ respectExternal: false })],
};
