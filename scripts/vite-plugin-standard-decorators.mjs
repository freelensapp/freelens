/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// Lowers standard (TC39 Stage 3) decorators for Vite and Vitest.
//
// MobX 7 supports only standard decorators, so the sources are compiled
// without `experimentalDecorators`. Oxc, which transpiles TypeScript for
// Vite 8 and Vitest 4, lowers legacy decorators only: it passes standard ones
// through untouched, and neither Node nor Electron can run them yet. This
// plugin runs before Oxc and hands every TypeScript module that has a
// decorator to esbuild, which lowers the decorators (and the `accessor` fields
// they sit on) and nothing else. Oxc then processes the result like any other
// module, JSX included.

import { transform } from "esbuild";

const typeScriptModule = /\.[cm]?tsx?$/;
const decoratorAtLineStart = /^\s*@[A-Za-z_$]/m;

/** @returns {import("vite").Plugin} */
export function standardDecorators() {
  return {
    name: "freelens:standard-decorators",
    enforce: "pre",
    async transform(code, id) {
      const path = id.split("?", 1)[0];

      if (!typeScriptModule.test(path) || path.includes("/node_modules/") || !decoratorAtLineStart.test(code)) {
        return null;
      }

      const result = await transform(code, {
        loader: path.endsWith("x") ? "tsx" : "ts",
        jsx: "preserve",
        target: "esnext",
        supported: { decorators: false },
        sourcefile: path,
        sourcemap: "external",
        tsconfigRaw: {
          compilerOptions: {
            experimentalDecorators: false,
            useDefineForClassFields: true,
            verbatimModuleSyntax: false,
          },
        },
      });

      return { code: result.code, map: result.map };
    },
  };
}
