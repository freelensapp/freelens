/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger/dist";
import { getInjectable } from "@ogre-tools/injectable";
import getLatestVersion from "get-latest-version";
import * as semver from "semver";
import openLinkInBrowserInjectable from "../../../../../../common/utils/open-link-in-browser.injectable";
import appNameInjectable from "../../../../../../common/vars/app-name.injectable";
import applicationCopyrightInjectable from "../../../../../../common/vars/application-copyright.injectable";
import extensionApiVersionInjectable from "../../../../../../common/vars/extension-api-version.injectable";
import isWindowsInjectable from "../../../../../../common/vars/is-windows.injectable";
import productNameInjectable from "../../../../../../common/vars/product-name.injectable";
import showMessagePopupInjectable from "../../../../../../main/electron-app/features/show-message-popup.injectable";
import { buildVersionInitializable } from "../../../../../vars/build-version/common/token";

const showAboutInjectable = getInjectable({
  id: "show-about",

  instantiate: (di) => {
    const buildVersion = di.inject(buildVersionInitializable.stateToken);
    const extensionApiVersion = di.inject(extensionApiVersionInjectable);
    const showMessagePopup = di.inject(showMessagePopupInjectable);
    const isWindows = di.inject(isWindowsInjectable);
    const appName = di.inject(appNameInjectable);
    const productName = di.inject(productNameInjectable);
    const applicationCopyright = di.inject(applicationCopyrightInjectable);
    const openLinkInBrowser = di.inject(openLinkInBrowserInjectable);
    const logger = di.inject(loggerInjectionToken);

    return async () => {
      let newVersion: string | undefined;

      const appInfo = [
        `${appName}: ${buildVersion}`,
        `Extension API: ${extensionApiVersion}`,
        `Electron: ${process.versions.electron}`,
        `Chrome: ${process.versions.chrome}`,
        `Node: ${process.versions.node}`,
        `Platform: ${process.platform}`,
        `Architecture: ${process.arch}`,
        applicationCopyright,
      ];

      const buttons = ["Close"];

      try {
        const latestVersion = await getLatestVersion("@freelensapp/core");
        if (latestVersion && semver.gt(latestVersion, buildVersion)) {
          newVersion = latestVersion;
          appInfo.push("", `Latest version: ${latestVersion}`);
          buttons.push("Open Release Notes");
        }
      } catch (error) {
        logger.error(`[SHOW-ABOUT]: Failed to check latest version: ${error}`);
      }

      const returnValue = await showMessagePopup(
        `${isWindows ? " ".repeat(2) : ""}${appName}`,
        productName,
        appInfo.join("\r\n"),
        {
          type: newVersion ? "question" : "info",
          buttons,
        },
      );

      if (newVersion && returnValue.response === 1) {
        await openLinkInBrowser(`https://github.com/freelensapp/freelens/releases/tag/v${newVersion}`);
      }
    };
  },
});

export default showAboutInjectable;
