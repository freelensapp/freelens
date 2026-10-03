/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { existsSync } from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import * as utils from "../helpers/utils";

import type { ElectronApplication, Page } from "playwright";

// The in-repo contract fixture, installed as an unpacked directory: the
// installer registers it in place, so what the application loads is exactly
// what `pnpm build` wrote to its `dist/`. The test does not build it itself:
// in CI, devDependencies such as turbo are gone by the time it runs.
const fixtureExtensionDirectory = fileURLToPath(new URL("../../../packages/fixture-extension", import.meta.url));
const fixtureExtensionName = "@freelensapp/fixture-extension";

describe("extensions page tests", () => {
  let window: Page;
  let cleanup: undefined | (() => Promise<void>);
  let app: ElectronApplication;

  beforeAll(() => {
    for (const entryPoint of ["main.js", "renderer.js"]) {
      if (!existsSync(path.join(fixtureExtensionDirectory, "dist", entryPoint))) {
        throw new Error(
          `${fixtureExtensionName} is not built (no dist/${entryPoint}): run \`pnpm build\` or \`pnpm build:fixture-extension\` from the repository root`,
        );
      }
    }
  });

  beforeEach(
    async () => {
      ({ window, cleanup, app } = await utils.start());
      await utils.clickWelcomeButton(window);
    },
    10 * 60 * 1000,
  );

  afterEach(
    async () => {
      await cleanup?.();
    },
    10 * 60 * 1000,
  );

  it(
    "installs the fixture extension and runs its renderer entry",
    async () => {
      await app.evaluate(async ({ app }) => {
        await app.applicationMenu
          ?.getMenuItemById(process.platform === "darwin" ? "mac" : "file")
          ?.submenu?.getMenuItemById("navigate-to-extensions")
          ?.click();
      });

      await window.getByPlaceholder("Name, URL, or path to a package or directory").fill(fixtureExtensionDirectory);
      await window.getByRole("button", { name: "Install", exact: true }).click();

      // A directory is registered in place, which the installer confirms first.
      await window.click('[data-testid="confirmation-dialog"] [data-testid="confirm"]');

      const row = window.getByTestId("extensions-table").locator("tbody tr", { hasText: fixtureExtensionName });

      // The status column, which reads "Incompatible" if the gate refuses the
      // fixture's `engines.freelens`.
      await row.locator("td").nth(2).getByText("Enabled", { exact: true }).waitFor();

      // Registered only through the fixture's `statusBarItems`, and rendered
      // with its hooks, so it appears only if the renderer entry ran against the
      // host's React.
      await window.waitForSelector('[data-testid="fixture-status-bar-item"]', { timeout: 60_000 });
    },
    10 * 60 * 1000,
  );
});
