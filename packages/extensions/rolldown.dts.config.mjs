/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// Bundles the declaration tree emitted by `tsc -p tsconfig.dts.generated.json`
// (see `dist-types/`) into a single self-contained `dist/extension-api.d.ts`.
// The declarations already exist, so `rolldown-plugin-dts` only bundles them
// (`dtsInput`) and never runs a compiler of its own.
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
// counts as its package (`react/jsx-runtime` is `react`).
//
// The same plugin fails the build on any dependency on Node: an import of a
// builtin (`node:fs`, or a bare `fs`) or a `/// <reference types="node" />`,
// which is how a declaration names Node's global types. Renderer code gets no
// guarantee of Node, so the API declaration must not reference it. When this
// fails, the likely cause is the pnpm patch of `rolldown-plugin-dts` no longer
// applying: unpatched, the plugin keeps every member of `@freelensapp/utilities`
// in the bundle, the Node-bound ones `Common.Util` leaves out included,
// together with their `node:` imports.

import { readFileSync } from "node:fs";
import { isBuiltin } from "node:module";
import path from "node:path";
import { defineConfig } from "rolldown";
import { parseAst } from "rolldown/parseAst";
import { dts } from "rolldown-plugin-dts";
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
// carry no types and are resolved to an empty module. Its id ends in `.d.ts`
// so that the dts plugin takes it for a declaration like the others.
const assetModule = /\.(s?css|svg|png|jpg|ttf|woff2?|eot)$|\?(raw|worker)$/;
const emptyModuleId = "\0empty-asset-module.d.ts";

const workspaceDtsAlias = {
  name: "workspace-dts-alias",

  // `pre`, ahead of the dts plugin's own `pre` resolver: that one prefers its
  // own resolution through node_modules, which would take a workspace
  // specifier to the package's sources instead of their emitted declarations.
  resolveId: {
    order: "pre",

    handler(source) {
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

/** Maps a bare specifier to its package: "react/jsx-runtime" to "react". */
const packageOf = (specifier) => {
  const segments = specifier.split("/");

  return specifier.startsWith("@") ? segments.slice(0, 2).join("/") : segments[0];
};

/** "react" to "@types/react", "@scope/name" to "@types/scope__name". */
const typesPackageOf = (packageName) => `@types/${packageName.replace(/^@/, "").replace("/", "__")}`;

const isDeclared = (specifier) => {
  const packageName = packageOf(specifier);

  return declaredPackages.has(packageName) || declaredPackages.has(typesPackageOf(packageName));
};

const isBareSpecifier = (id) => !id.startsWith(".") && !path.isAbsolute(id) && !id.startsWith("\0");

const external = (id) => isBareSpecifier(id) && !workspaceAliases.has(id);

/** AST nodes whose `source` names a module the declaration depends on. */
const moduleReferences = new Set([
  "ImportDeclaration",
  "ExportNamedDeclaration",
  "ExportAllDeclaration",
  "ImportExpression",
  "TSImportType",
]);

/** Every module specifier a declaration imports, re-exports or names in an `import("…")` type. */
const referencedSpecifiers = (code) => {
  const specifiers = new Set();

  const visit = (node) => {
    if (Array.isArray(node)) {
      node.forEach(visit);
    } else if (node !== null && typeof node === "object") {
      if (moduleReferences.has(node.type) && typeof node.source?.value === "string") {
        specifiers.add(node.source.value);
      }

      Object.values(node).forEach(visit);
    }
  };

  visit(parseAst(code, { lang: "dts" }));

  return specifiers;
};

/** A `/// <reference types="node" />` directive, which pulls in `@types/node` wherever the file goes. */
const nodeTypesReference = /^\/\/\/\s*<reference\s+types\s*=\s*["']node["']/m;

// Checked against the generated bundle rather than everything `external` saw:
// the inlined workspace declarations import more than the API surface reaches
// (winston, node-pty, ...), and tree-shaking drops those imports together with
// the declarations that used them. The bundle is parsed rather than read off
// the chunk's `imports`, because the dts plugin leaves an external
// `import("…")` type inline where it found it instead of hoisting it into an
// import statement, so it never shows up there.
const declaredExternals = {
  name: "declared-externals",

  generateBundle(_options, bundle) {
    const chunks = Object.values(bundle).filter((output) => output.type === "chunk");
    const referenced = new Set(chunks.flatMap((chunk) => [...referencedSpecifiers(chunk.code)]));
    const externals = [...referenced].filter(isBareSpecifier).sort();
    const builtins = externals.filter((specifier) => isBuiltin(specifier));

    if (chunks.some((chunk) => nodeTypesReference.test(chunk.code))) {
      builtins.push('/// <reference types="node" />');
    }

    if (builtins.length > 0) {
      this.error(
        "the API declaration must not depend on Node, but it references:\n" +
          builtins.map((specifier) => `  ${specifier}`).join("\n") +
          "\nA likely cause is the pnpm patch of rolldown-plugin-dts (patchedDependencies in" +
          " pnpm-workspace.yaml) no longer applying, which lets the Node-bound members of" +
          " @freelensapp/utilities that Common.Util leaves out into the bundle.",
      );
    }

    const undeclared = externals.filter((specifier) => !isDeclared(specifier));

    if (undeclared.length > 0) {
      this.error(
        "the declaration imports packages that package.json declares in neither dependencies nor peerDependencies," +
          " by themselves or through their @types/ package:\n" +
          undeclared.map((specifier) => `  ${specifier}`).join("\n"),
      );
    }
  },
};

export default defineConfig({
  input: {
    "extension-api": path.join(outRoot, "packages/extensions/src/extension-api.d.ts"),
  },
  output: {
    dir: path.join(packageRoot, "dist"),
    format: "es",
  },
  external,
  plugins: [
    workspaceDtsAlias,
    // No generator runs on declaration input, but the plugin still picks one
    // up front, and with TypeScript 7 installed it picks `tsgo`, which refuses
    // to start without a tsconfig. Oxc needs none.
    dts({ dtsInput: true, emitDtsOnly: true, generator: "oxc", tsconfig: false }),
    declaredExternals,
  ],
});
