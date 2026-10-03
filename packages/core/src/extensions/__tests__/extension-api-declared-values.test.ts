/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// Every value the published declaration promises exists at runtime.
//
// `dist/extension-api.d.ts` is not the source: it is what rolldown-plugin-dts
// rewrites the source into, and that rewrite can change the meaning of a name.
// A type-only re-export of a class, erased from the runtime namespace, can come
// out of it as a value, so `new Renderer.K8sApi.PodApi(…)` or
// `x instanceof Common.LensExtension` compiles against the declaration and
// throws in the extension. Neither `./extension-api.test.ts`, which sees only
// the runtime, nor `./extension-api.types.ts`, which sees only the source
// types, can see the two disagree.
//
// This file puts them side by side. The TypeScript checker walks the namespaces
// the declaration exports, `Common`, `Main` and `Renderer` and every namespace
// nested in them, and each member it declares as a value has to be a key of the
// corresponding runtime namespace object. Only the key is checked: some members
// are lazy and resolve through the DI container when read, which this file has
// no business doing.
//
// When a member fails, it is almost always a class re-exported type-only, with
// `export type { C }` or `export type { C } from "…"`, somewhere under
// `common-api/`, `main-api/` or `renderer-api/`. Replace the re-export with a
// type alias carrying the class's type parameters, as the existing ones do:
//
//   export type C<T = Default> = import("@freelensapp/some-package").C<T>;
//
// The "Extension API" section of AGENTS.md describes this rule.
//
// The declaration is a build artifact: `pnpm test:unit` builds it first, as a
// dependency of the fixture extension. The checker is TypeScript 7's API,
// `typescript/unstable/sync`, which runs `tsgo` in a child process and serves
// it a project read from a tsconfig, so the suite writes one that holds the
// declaration alone. The API is marked unstable, so a `typescript` update may
// need this file adjusted.

import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { API, SymbolFlags, type Symbol as TsSymbol } from "typescript/unstable/sync";
import * as extensions from "../extension-api";

const declarationPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../extensions/dist/extension-api.d.ts",
);

/** The dotted paths of the values the declaration exports, namespaces included. */
const declaredValuePaths = (): string[] => {
  const projectDir = mkdtempSync(path.join(tmpdir(), "extension-api-declared-values-"));
  const configPath = path.join(projectDir, "tsconfig.json");

  writeFileSync(
    configPath,
    JSON.stringify({
      compilerOptions: {
        module: "esnext",
        moduleResolution: "bundler",
        noEmit: true,
        skipLibCheck: true,
        types: [],
      },
      files: [declarationPath],
    }),
  );

  const api = new API({ cwd: projectDir });

  try {
    const project = api.updateSnapshot({ openProjects: [configPath] }).getProject(configPath);
    const checker = project?.checker;
    const sourceFile = project?.program.getSourceFile(declarationPath);
    const moduleSymbol = sourceFile && checker?.getSymbolAtLocation(sourceFile);

    if (!checker || !moduleSymbol) {
      throw new Error(`${declarationPath} is not a module`);
    }

    const resolve = (symbol: TsSymbol) =>
      symbol.flags & SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
    const paths: string[] = [];

    const walk = (container: TsSymbol, prefix: string) => {
      for (const member of checker.getExportsOfModule(container)) {
        const target = resolve(member);

        if (!(target.flags & SymbolFlags.Value)) {
          continue;
        }

        const memberPath = prefix ? `${prefix}.${member.name}` : member.name;

        paths.push(memberPath);

        if (target.flags & SymbolFlags.ValueModule) {
          walk(target, memberPath);
        }
      }
    };

    walk(moduleSymbol, "");

    return paths.sort();
  } finally {
    api.close();
    rmSync(projectDir, { recursive: true, force: true });
  }
};

/** Whether the runtime namespace object at `memberPath` has the member's key, reading only namespaces. */
const existsAtRuntime = (memberPath: string): boolean => {
  const segments = memberPath.split(".");
  const key = segments.pop() as string;
  let container: unknown = extensions;

  for (const segment of segments) {
    container = (container as Record<string, unknown>)[segment];
  }

  return (typeof container === "object" || typeof container === "function") && container !== null && key in container;
};

describe("the values declared by dist/extension-api.d.ts", () => {
  let declared: string[];

  beforeAll(() => {
    if (!existsSync(declarationPath)) {
      throw new Error(
        `The extension API declaration is not built. Run \`pnpm --filter @freelensapp/extensions build\` (or \`pnpm build\`) before this suite; expected ${declarationPath}`,
      );
    }

    declared = declaredValuePaths();
  });

  it("include the three namespaces", () => {
    expect(declared).toEqual(expect.arrayContaining(["Common", "Main", "Renderer"]));
  });

  it("all exist on the runtime namespace objects", () => {
    expect(
      declared.filter((memberPath) => !existsAtRuntime(memberPath)),
      "These members are declared as values but do not exist at runtime. If one is a class re-exported with " +
        '`export type { C }`, replace the re-export with a type alias, `export type C<T> = import("…").C<T>`, ' +
        "carrying the class's type parameters (see the Extension API section of AGENTS.md)",
    ).toEqual([]);
  });
});
