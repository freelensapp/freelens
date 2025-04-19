/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { ElectronApplication, Page } from "playwright";
import * as utils from "../helpers/utils";

describe("extensions page tests", () => {
  let window: Page;
  let cleanup: undefined | (() => Promise<void>);
  let app: ElectronApplication;

  beforeEach(async () => {
    ({ window, cleanup, app } = await utils.start());
    await utils.clickWelcomeButton(window);
  }, 10 * 60 * 1000);

  afterEach(async () => {
    await cleanup?.();
  }, 10 * 60 * 1000);

  const extensions = process.env.EXTENSION_PATH ? [process.env.EXTENSION_PATH] : [
    "@freelensapp/freelens-node-pod-menu",
    "@freelensapp/freelens-node-pod-menu@1.0.0",
    "@freelensapp/freelens-node-pod-menu@1.1.0",
  ];

  it.each(extensions)("installs an extension %s", async (extension) => {
    // Navigate to extensions page
    console.log("await app.evaluate");

    await app.evaluate(async ({ app }) => {
      await app.applicationMenu
        ?.getMenuItemById(process.platform === "darwin" ? "mac" : "file")
        ?.submenu?.getMenuItemById("navigate-to-extensions")
        ?.click();
    });

    // Trigger extension install
    const textbox = window.getByPlaceholder("Name or file path or URL");

    await textbox.fill(extension);

    const install_button_selector =
      'button[class*="Button install-module__button--"]';

    await window.click(install_button_selector.concat("[data-waiting=false]"));

    // Expect extension to be listed in installed list and enabled
    const installedExtensionName = await (
      await window.waitForSelector(
        'div[class*="installed-extensions-module__extensionName--"]',
      )
    ).textContent();

    expect(installedExtensionName).toBeTruthy();

    const installedExtensionState = await (
      await window.waitForSelector(
        'div[class*="installed-extensions-module__enabled--"]',
      )
    ).textContent();

    expect(installedExtensionState).toBe("Enabled");

    await window.click(
      'i[data-testid*="close-notification-for-notification_"]',
    );

    await window.click(
      'div[class*="close-button-module__closeButton--"][aria-label="Close"]',
    );
  },
    100 * 60 * 1000);
});
