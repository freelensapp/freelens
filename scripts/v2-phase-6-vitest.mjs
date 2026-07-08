#!/usr/bin/env node
// Phase 6 of the v2 plan (docs/v2-plan.md, D8): mechanical Jest -> Vitest
// codemod over test sources. Rewrites the D8 dependency mapping import
// specifiers and the jest.* runtime API to vi.* (globals are enabled in the
// root vitest.config.ts, so no `import { vi }` is added).
//
// Idempotent and dry-run by default; pass --write to apply. Re-running after a
// successful --write reports "0 file(s) would change".
//
// Deliberately NOT handled here (behaviour-bearing, left for local iteration,
// CI red allowed on v2 per D9):
//   - deleting the 33 jest.config.js files and the shared @freelensapp/jest
//     package, and swapping devDependencies + the pnpm lockfile;
//   - repointing per-package `test:unit` scripts from `jest` to `vitest run`;
//   - wiring setupFiles and regenerating snapshots per package (§6 risk);
//   - confirming @async-fn/vitest needs no equivalent of the Jest pnpm patch;
//   - re-enabling unit tests in CI.

import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const write = process.argv.includes("--write");
const root = fileURLToPath(new URL("..", import.meta.url));

const SKIP_DIRS = new Set(["node_modules", "dist", "build", "coverage", ".git", ".turbo", "static"]);

// Only touch test sources and the setup/mock files they rely on. jest.config.js
// files are intentionally excluded — they are deleted during local iteration,
// not rewritten.
const isTargetFile = (rel) =>
  /\.(test)\.(ts|tsx|js)$/.test(rel) ||
  /(^|\/)(jest\.setup|jest-after-env\.setup|jest\.timezone|setup-react-tests)\.(ts|tsx)$/.test(rel) ||
  /(^|\/)__mocks__\//.test(rel);

// D8 dependency mapping — import/require specifier rewrites.
const SPECIFIER_RULES = [
  { from: /@async-fn\/jest/g, to: "@async-fn/vitest" },
  { from: /jest-mock-extended/g, to: "vitest-mock-extended" },
  { from: /jest-canvas-mock/g, to: "vitest-canvas-mock" },
  // Only the bare specifier; leave an already-migrated `/vitest` entry alone.
  { from: /@testing-library\/jest-dom(?!\/vitest)/g, to: "@testing-library/jest-dom/vitest" },
];

// Scoped jest.* runtime API -> vi.* (whitelist, so strings like
// "@testing-library/jest-dom", `jest-canvas-mock`, comments, and jest.config
// references are left untouched).
const JEST_API =
  "fn|mock|unmock|doMock|dontMock|setMock|spyOn|mocked|clearAllMocks|resetAllMocks|restoreAllMocks|" +
  "resetModules|requireActual|requireMock|createMockFromModule|useFakeTimers|useRealTimers|" +
  "advanceTimersByTime|advanceTimersByTimeAsync|runAllTimers|runAllTimersAsync|runOnlyPendingTimers|" +
  "setSystemTime|getRealSystemTime|isMockFunction|retryTimes|" +
  "Mock|Mocked|MockedFunction|MockedClass|MockedObject|MockInstance";
const JEST_API_RE = new RegExp(`\\bjest\\.(${JEST_API})\\b`, "g");

const rewrite = (source) => {
  let out = source;
  let changed = 0;
  for (const { from, to } of SPECIFIER_RULES) {
    out = out.replace(from, () => {
      changed++;
      return to;
    });
  }
  out = out.replace(JEST_API_RE, (_m, api) => {
    changed++;
    return `vi.${api}`;
  });
  return { out, changed };
};

const walk = function* (dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) yield* walk(join(dir, entry.name));
    } else if (entry.isFile()) {
      yield join(dir, entry.name);
    }
  }
};

let filesChanged = 0;
let totalEdits = 0;

for (const abs of walk(root)) {
  const rel = relative(root, abs);
  if (!isTargetFile(rel)) continue;
  const source = readFileSync(abs, "utf8");
  const { out, changed } = rewrite(source);
  if (changed === 0) continue;
  filesChanged++;
  totalEdits += changed;
  if (write) {
    writeFileSync(abs, out);
    console.log(`edited ${rel} (${changed} change${changed === 1 ? "" : "s"})`);
  } else {
    console.log(`would edit ${rel} (${changed} change${changed === 1 ? "" : "s"})`);
  }
}

const verb = write ? "edited" : "would change";
console.log(`\n${filesChanged} file(s) ${verb}, ${totalEdits} edit(s) total.`);
if (!write && filesChanged > 0) {
  console.log("Dry run — re-run with --write to apply.");
}
