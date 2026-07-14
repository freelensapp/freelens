/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { createRequire } from "node:module";
import { getInjectable } from "@ogre-tools/injectable";

const pathToPnpmCliInjectable = getInjectable({
  id: "path-to-pnpm-cli",
  instantiate: () => {
    // The bundles are ESM: the main process has no `require` global, while the
    // node-integrated renderer keeps it. Derive a runtime `require` that
    // resolves against node_modules from either process, instead of the
    // `eval("require")` trick that Rollup flags as a security risk. Resolved
    // lazily here (this injectable is only ever instantiated in the main
    // process, via fork-pnpm) so it never runs the `createRequire` fallback
    // against the renderer's non-file `import.meta.url`.
    const runtimeRequire = globalThis.require ?? createRequire(import.meta.url);
    const pnpmPackageJson = runtimeRequire.resolve("pnpm");

    return `${pnpmPackageJson.substring(0, pnpmPackageJson.indexOf("package.json"))}bin/pnpm.cjs`;
  },
  causesSideEffects: true,
});

export default pathToPnpmCliInjectable;
