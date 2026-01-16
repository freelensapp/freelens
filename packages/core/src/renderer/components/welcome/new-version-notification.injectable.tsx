/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { showInfoNotificationInjectable } from "@freelensapp/notifications";
import { getInjectable } from "@ogre-tools/injectable";
import React from "react";
import * as semver from "semver";
import productNameInjectable from "../../../common/vars/product-name.injectable";
import userPreferencesStateInjectable from "../../../features/user-preferences/common/state.injectable";
import { buildVersionInitializable } from "../../../features/vars/build-version/common/token";
import getLatestVersionViaChannelInjectable from "../../common/utils/get-latest-version-via-channel.injectable";

const newVersionNotificationInjectable = getInjectable({
  id: "new-version-notification",

  instantiate: (di) => {
    const productName = di.inject(productNameInjectable);
    const buildVersion = di.inject(buildVersionInitializable.stateToken);
    const currentVersion = buildVersion;
    const getLatestVersion = di.inject(getLatestVersionViaChannelInjectable);
    const logger = di.inject(loggerInjectionToken);
    const showInfoNotification = di.inject(showInfoNotificationInjectable);
    const userPreferencesState = di.inject(userPreferencesStateInjectable);

    return async () => {
      if (userPreferencesState.checkForUpdates === false) {
        return;
      }

      let newVersion: string | undefined;

      try {
        newVersion = await getLatestVersion();
      } catch (error) {
        logger.error(`[WELCOME]: Failed to check latest version: ${error}`);
      }

      if (newVersion && semver.gt(newVersion, currentVersion)) {
        showInfoNotification(
          <div className="flex column gaps">
            <div>
              {productName} v{newVersion} is available! Open the{" "}
              <a
                href={`https://github.com/freelensapp/freelens/releases`}
                target="_blank"
                rel="noreferrer"
                className="NotificationLink"
              >
                release notes
              </a>{" "}
              to learn more.
            </div>
          </div>,
        );
      }
    };
  },
});

export default newVersionNotificationInjectable;
