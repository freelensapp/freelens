import { defineConfig } from "vitest/config";

// Phase 7 of the v2 plan (docs/v2-plan.md): the integration tests, previously
// run by Jest (ts-jest + @side/jest-runtime), run under Vitest. They drive a
// packaged Electron app through Playwright, so they are not part of the root
// vitest.config.ts unit-test projects: they need `pnpm build:app:dir` output
// in dist/ and run only via `pnpm test:integration`.
export default defineConfig({
  test: {
    name: "freelens-integration",
    globals: true,
    // Playwright >= 1.61 bundles undici, which references `global.Request` at
    // import time; that global is undefined under jsdom, so the node
    // environment is required for the Playwright import to succeed.
    environment: "node",
    include: ["integration/__tests__/**/*.tests.ts"],
    // Jest ran with --runInBand: one packaged Electron app at a time.
    fileParallelism: false,
    testTimeout: 120_000,
    hookTimeout: 120_000,
    // These tests drive a packaged Electron app through Playwright and are
    // inherently prone to transient UI-timing flakiness (late renders, layout
    // shifts intercepting clicks, slow cluster responses). Retry a failed test
    // a couple of times before failing the whole run; a genuine failure still
    // fails after the retries are exhausted.
    retry: 2,
  },
});
