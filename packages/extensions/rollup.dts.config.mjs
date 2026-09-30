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
//
// Every external import has to be declared by this package, in `dependencies`
// or `peerDependencies`, either itself or through its `@types/` package. An
// extension compiles with `skipLibCheck`, so an import that does not resolve in
// its tree silently becomes `any` instead of an error, and nothing in the
// monorepo notices, where every such package happens to be installed. The
// `declared-externals` plugin fails the build on any that is not. A subpath
// counts as its package (`react/jsx-runtime` is `react`), and a Node builtin
// as `node`, which `@types/node` covers.

import { readFileSync } from "node:fs";
import { isBuiltin } from "node:module";
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

const manifest = JSON.parse(readFileSync(path.join(packageRoot, "package.json"), "utf8"));
const declaredPackages = new Set([
  ...Object.keys(manifest.dependencies ?? {}),
  ...Object.keys(manifest.peerDependencies ?? {}),
]);

/** Maps a bare specifier to its package: "react/jsx-runtime" to "react", "node:fs" to "node". */
const packageOf = (specifier) => {
  if (isBuiltin(specifier)) {
    return "node";
  }

  const segments = specifier.split("/");

  return specifier.startsWith("@") ? segments.slice(0, 2).join("/") : segments[0];
};

/** "react" to "@types/react", "@scope/name" to "@types/scope__name". */
const typesPackageOf = (packageName) => `@types/${packageName.replace(/^@/, "").replace("/", "__")}`;

const isDeclared = (specifier) => {
  const packageName = packageOf(specifier);

  return declaredPackages.has(packageName) || declaredPackages.has(typesPackageOf(packageName));
};

/** Bare specifiers `external` has left external. */
const externalSpecifiers = new Set();

const external = (id) => {
  const isExternal = !id.startsWith(".") && !path.isAbsolute(id) && !workspaceAliases.has(id);

  if (isExternal && !id.startsWith("\0")) {
    externalSpecifiers.add(id);
  }

  return isExternal;
};

// Checked against the imports of the generated bundle rather than everything
// `external` saw: the inlined workspace declarations import more than the API
// surface reaches (winston, node-pty, ...), and tree-shaking drops those
// imports together with the declarations that used them.
const declaredExternals = {
  name: "declared-externals",

  generateBundle(_options, bundle) {
    const imported = new Set(
      Object.values(bundle).flatMap((output) =>
        output.type === "chunk" ? [...output.imports, ...output.dynamicImports] : [],
      ),
    );
    const undeclared = [...imported]
      .filter((specifier) => externalSpecifiers.has(specifier) && !isDeclared(specifier))
      .sort();

    if (undeclared.length > 0) {
      this.error(
        "the declaration imports packages that package.json declares in neither dependencies nor peerDependencies," +
          " by themselves or through their @types/ package:\n" +
          undeclared.map((specifier) => `  ${specifier}`).join("\n"),
      );
    }
  },
};

export default {
  input: path.join(outRoot, "packages/extensions/src/extension-api.d.ts"),
  output: {
    file: path.join(packageRoot, "dist/extension-api.d.ts"),
    format: "es",
  },
  external,
  plugins: [workspaceDtsAlias, dts({ respectExternal: false }), declaredExternals],
};
