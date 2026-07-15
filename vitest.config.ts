import { existsSync, globSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Phase 6 of the v2 plan (docs/v2-plan.md, D8): a single root Vitest config
// with per-package `projects`, replacing the per-package jest.config.js files
// and the shared @freelensapp/jest package. Per-package projects preserve the
// ability to run and isolate each package's tests separately (relevant to
// D4's optional future package collapse).

const root = dirname(fileURLToPath(import.meta.url));

// A workspace package is a Vitest project when it declares vitest as a
// devDependency; this reproduces exactly the project set the deleted
// jest.config.js markers used to define.
const projectDirs = globSync("{packages/**,freelens}/package.json", { cwd: root })
  .filter((p) => !p.includes("node_modules"))
  .filter((p) => {
    const pkg = JSON.parse(readFileSync(join(root, p), "utf8")) as { devDependencies?: Record<string, string> };
    return Boolean(pkg.devDependencies?.vitest);
  })
  .map((p) => join(root, dirname(p)))
  .filter((dir) => existsSync(join(dir, "package.json")));

// Every project runs under jsdom (the old @freelensapp/jest configForReact)
// except freelens itself, whose tests are Playwright-driven integration tests
// that need the node environment. Vitest resolves CSS/asset imports natively,
// so the old moduleNameMapper entries (identity-obj-proxy, assetMock) were
// dropped rather than migrated.
const nodeEnvironmentDirs = new Set([join(root, "freelens")]);

// Per-package setup files.
const setupCandidates = ["src/vitest.setup.tsx", "src/vitest-after-env.setup.ts"];

// packages/core kept Jest's automatic node-module mocks in __mocks__/; Vitest
// has no automatic __mocks__ resolution for node modules, so they are wired as
// resolve aliases for the core project only. Core also carries Jest extras the
// other packages do not have: the canvas mock, the UTC timezone, and a longer
// test timeout.
const coreDir = join(root, "packages/core");
const coreMockAliases = {
  electron: join(coreDir, "__mocks__/electron.ts"),
  "monaco-editor": join(coreDir, "__mocks__/monaco-editor.ts"),
  "node-pty": join(coreDir, "__mocks__/node-pty.ts"),
  "react-virtualized-auto-sizer": join(coreDir, "__mocks__/react-virtualized-auto-sizer.tsx"),
  "@sentry/electron/main": join(coreDir, "__mocks__/@sentry/electron/main.ts"),
  "@sentry/electron/renderer": join(coreDir, "__mocks__/@sentry/electron/renderer.ts"),
};

export default defineConfig({
  test: {
    // D8: globals enabled for the transition so the jest.* -> vi.* codemod does
    // not have to add per-file `import { vi } from "vitest"`.
    globals: true,
    projects: projectDirs.map((dir) => {
      const name = JSON.parse(readFileSync(join(dir, "package.json"), "utf8")).name;
      return {
        // The shared Jest config mapped "^electron$" to identity-obj-proxy for
        // every monorepo package; vitest.electron-stub.ts keeps that behaviour
        // for the package projects. The freelens project is excluded: its
        // tests are Playwright-driven and talk to a real Electron binary.
        ...(nodeEnvironmentDirs.has(dir)
          ? {}
          : {
              resolve: {
                alias: dir === coreDir ? coreMockAliases : { electron: join(root, "vitest.electron-stub.ts") },
              },
            }),
        test: {
          name,
          root: dir,
          // `globals` is a project-scoped option and is not inherited from the
          // root-level `test` config, so it must be repeated per project.
          globals: true,
          // Jest mapped CSS modules to identity-obj-proxy, so tests and
          // snapshots assert plain class names ("StatusBar"), not Vite's
          // scoped ones ("_StatusBar_b5e087").
          css: { modules: { classNameStrategy: "non-scoped" } },
          environment: nodeEnvironmentDirs.has(dir) ? "node" : "jsdom",
          include: ["**/?(*.)test.{js,ts,tsx}"],
          exclude: ["**/node_modules/**", "**/dist/**", "**/build/**", "**/coverage/**"],
          setupFiles: [
            ...(dir === coreDir ? ["vitest-canvas-mock"] : []),
            ...setupCandidates
              .map((rel) => join(dir, rel))
              .filter((abs) => existsSync(abs))
              .map((abs) => `./${relative(dir, abs)}`),
          ],
          // Core runs on the threads pool: measured ~8% faster than the
          // default forks pool on the import-dominated core project, with
          // per-file isolation kept (fresh worker context per test file).
          // vmThreads measured ~26% faster per shard but crashed the full
          // suite at 13.7 GB peak memory, so it is rejected.
          ...(dir === coreDir ? { pool: "threads" as const, testTimeout: 15000, env: { TZ: "UTC" } } : {}),
        },
      };
    }),
    // Coverage stays provider v8, reporter lcov (D8).
    coverage: {
      provider: "v8",
      reporter: ["lcov"],
    },
  },
});
