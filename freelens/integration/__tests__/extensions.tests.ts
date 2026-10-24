/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import * as utils from "../helpers/utils";

import type { ElectronApplication, Page } from "playwright";

/** The part of the main process's extension API global this test calls. */
interface MainShellGlobal {
  FreelensExtensionApi: {
    Main: {
      Shell: {
        getKubectlPath(): Promise<string>;
        getEnvironment(): Promise<Record<string, string>>;
      };
    };
  };
}

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

  // What `Main.Shell` hands a main-process extension in the packaged
  // application, on each platform the integration tests run on. On Windows the
  // environment Freelens starts from spells the variable `Path`, and the record
  // must still carry it under the one key `PATH`.
  it(
    "hands main-process extensions an environment with one PATH key, which runs the host's kubectl",
    async () => {
      const { kubectlPath, env } = await app.evaluate(async () => {
        const { Shell } = (globalThis as unknown as MainShellGlobal).FreelensExtensionApi.Main;

        return { kubectlPath: await Shell.getKubectlPath(), env: await Shell.getEnvironment() };
      });

      expect(Object.keys(env).filter((key) => key.toUpperCase() === "PATH")).toEqual(["PATH"]);
      // The bundled binaries directory, last, as the fallback.
      expect(env.PATH.split(path.delimiter).at(-1)).toBe(path.dirname(kubectlPath));

      const { stdout } = await promisify(execFile)(kubectlPath, ["version", "--client", "--output", "json"], { env });

      expect(JSON.parse(stdout)).toHaveProperty("clientVersion.gitVersion");
    },
    10 * 60 * 1000,
  );
});
