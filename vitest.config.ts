import { existsSync, globSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Phase 6 of the v2 plan (docs/v2-plan.md, D8): replace the 33 jest.config.js
// files and the shared @freelensapp/jest package with a single root Vitest
// config that uses `projects`. Per-package projects preserve the ability to run
// and isolate each package's tests separately (relevant to D4's optional future
// package collapse).
//
// WIP scaffold: this config only defines the project topology. Driving the
// suites green package by package, regenerating snapshots per package (not in
// one commit — see the Snapshot-churn risk in §6), and re-enabling unit tests
// in CI are the behaviour-bearing steps left for local iteration. CI red is
// allowed on `v2` (D9), and unit tests are disabled there until Phase 6
// completes.

const root = dirname(fileURLToPath(import.meta.url));

// Discover every package that currently defines a Jest project. Phase 6 keeps
// the same project boundaries; each package's jest.config.js is deleted during
// local iteration once its Vitest project runs green.
const projectDirs = globSync("packages/**/jest.config.js", { cwd: root })
  .map((p) => join(root, dirname(p)))
  .filter((dir) => !dir.includes("node_modules"))
  .concat([join(root, "freelens")])
  .filter((dir) => existsSync(join(dir, "package.json")));

// The current @freelensapp/jest split maps configForReact -> jsdom and
// configForNode -> node. Vitest resolves CSS/asset imports natively, so the
// moduleNameMapper entries (identity-obj-proxy, assetMock) are dropped rather
// than migrated.
//
// TODO(D8): classify each project as jsdom vs node faithfully. Today the
// classification is inferred from whether the package's jest.config.js selected
// `configForReact`; verify per package during local iteration and pin the few
// node-only projects (e.g. Playwright-driven integration in `freelens`) to the
// node environment.
const nodeEnvironmentDirs = new Set([join(root, "freelens")]);

// TODO(D8): wire the shared React setup (packages/infrastructure/jest/
// setup-react-tests.ts) and per-package setups (jest.setup.tsx,
// jest-after-env.setup.ts, jest.timezone.ts) as Vitest setupFiles once their
// jest.* globals are codemodded to vi.* (scripts/v2-phase-6-vitest.mjs).
const setupCandidates = ["src/jest.setup.tsx", "src/jest-after-env.setup.ts"];

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
          : { resolve: { alias: { electron: join(root, "vitest.electron-stub.ts") } } }),
        test: {
          name,
          root: dir,
          // `globals` is a project-scoped option and is not inherited from the
          // root-level `test` config, so it must be repeated per project.
          globals: true,
          environment: nodeEnvironmentDirs.has(dir) ? "node" : "jsdom",
          include: ["**/?(*.)test.{js,ts,tsx}"],
          exclude: ["**/node_modules/**", "**/dist/**", "**/build/**", "**/coverage/**"],
          setupFiles: setupCandidates
            .map((rel) => join(dir, rel))
            .filter((abs) => existsSync(abs))
            .map((abs) => `./${relative(dir, abs)}`),
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
