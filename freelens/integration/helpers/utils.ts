/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { disposer } from "@freelensapp/utilities";
import { createHash } from "crypto";
import { mkdirp, remove } from "fs-extra";
import * as os from "os";
import * as path from "path";
import { _electron as electron } from "playwright";
import { setImmediate } from "timers";
import * as uuid from "uuid";

import type { ElectronApplication, Frame, Page } from "playwright";

export const appPaths: Partial<Record<NodeJS.Platform, string>> = {
  win32: "./dist/win-unpacked/Freelens.exe",
  linux: `./dist/linux${process.arch === "arm64" ? "-arm64" : ""}-unpacked/freelens`,
  darwin: `./dist/mac${process.arch === "arm64" ? "-arm64" : ""}/Freelens.app/Contents/MacOS/Freelens`,
};

async function getMainWindow(app: ElectronApplication, timeout = 50_000): Promise<Page> {
  return new Promise((resolve, reject) => {
    const cleanup = disposer();
    let stdoutBuf = "";

    const onWindow = (page: Page) => {
      console.log(`Page opened: ${page.url()}`);

      if (page.url().startsWith("https://renderer.freelens.app")) {
        cleanup();
        console.log(stdoutBuf);
        resolve(page);
      }
    };

    app.on("window", onWindow);
    cleanup.push(() => app.off("window", onWindow));

    app.on("close", cleanup);
    cleanup.push(() => app.off("close", cleanup));

    const stdout = app.process().stdout!;
    const onData = (chunk: any) => (stdoutBuf += chunk.toString());

    stdout.on("data", onData);
    cleanup.push(() => stdout.off("data", onData));

    const timeoutId = setTimeout(() => {
      cleanup();
      console.log(stdoutBuf);
      reject(new Error(`Freelens did not open the main window within ${timeout}ms`));
    }, timeout);

    cleanup.push(() => clearTimeout(timeoutId));
  });
}

async function attemptStart() {
  const FREELENS_INTEGRATION_TESTING_DIR = path.join(os.tmpdir(), "freelens-integration-testing", uuid.v4());
  process.env.FREELENS_INTEGRATION_TESTING_DIR = FREELENS_INTEGRATION_TESTING_DIR;

  // Playwright does not work with jest-runtime for reading the package.json
  process.env.PW_VERSION_OVERRIDE = require("./../../package.json").devDependencies["playwright"].replace(
    /[^0-9.]/g,
    "",
  );

  // Fixes `electron.launch: setImmediate is not defined`
  global.setImmediate = setImmediate;

  // Make sure that the directory is clear
  await remove(FREELENS_INTEGRATION_TESTING_DIR);
  // We need original .kube/config with kind context
  const testDir = path.join(FREELENS_INTEGRATION_TESTING_DIR, "home", ".freelens", "extensions");
  await mkdirp(testDir);

  const app = await electron.launch({
    args: ["--integration-testing"], // this argument turns off the blocking of quit
    executablePath: appPaths[process.platform],
    bypassCSP: true,
    env: {
      FREELENS_INTEGRATION_TESTING_DIR,
      LOG_LEVEL: "debug",
      ...process.env,
    },
    timeout: 100_000,
  });

  try {
    const window = await getMainWindow(app);

    return {
      app,
      window,
      cleanup: async () => {
        try {
          await app.close();
          await withTimeout(remove(FREELENS_INTEGRATION_TESTING_DIR), 15_000);
        } catch (_e) {
          // no-op
        }
      },
    };
  } catch (error) {
    try {
      await app.close();
      await withTimeout(remove(FREELENS_INTEGRATION_TESTING_DIR), 15_000);
    } catch (_e) {
      // no-op
    }
    throw error;
  }
}

export async function start() {
  // this is an attempted workaround for an issue with playwright not always getting the main window when using Electron 14.2.4 (observed on windows)
  for (let i = 0; ; i++) {
    try {
      return await attemptStart();
    } catch (error) {
      if (i === 4) {
        throw error;
      }
    }
  }
}

export async function clickWelcomeButton(window: Page) {
  await window.click("[data-testid=welcome-menu-container] li a");
}

function kindEntityId(clusterName: string) {
  return createHash("md5")
    .update(`${path.join(os.homedir(), ".kube", "config")}:kind-${clusterName}`)
    .digest("hex");
}

/**
 * From the catalog, click the kind entity and wait for it to connect, returning its frame
 */
export async function launchKindClusterFromCatalog(kindClusterName: string, window: Page): Promise<Frame> {
  await window.click(`div.TableCell >> text='kind-${kindClusterName}'`);

  const kindFrame = await window.waitForSelector(`#cluster-frame-${kindEntityId(kindClusterName)}`);

  const frame = await kindFrame.contentFrame();

  if (!frame) {
    throw new Error("No iframe for kind cluster found");
  }

  await frame.waitForSelector("[data-testid=cluster-sidebar]");

  return frame;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeout: NodeJS.Timeout | undefined = undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      reject(new Error(`Operation timed out after ${timeoutMs} ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}
