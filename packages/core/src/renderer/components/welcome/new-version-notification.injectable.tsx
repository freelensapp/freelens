/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import React from "react"
import { getInjectable } from "@ogre-tools/injectable";
import { loggerInjectionToken } from "@freelensapp/logger";
import * as semver from "semver";
import { showInfoNotificationInjectable } from "@freelensapp/notifications";

import { buildVersionInitializable } from "../../../features/vars/build-version/common/token";
import getLatestVersionViaChannelInjectable from "../../common/utils/get-latest-version-via-channel.injectable";
import productNameInjectable from "../../../common/vars/product-name.injectable";

const newVersionNotificationInjectable = getInjectable({
  id: "new-version-notification",

  instantiate: (di) => {
    const productName = di.inject(productNameInjectable);
    const buildVersion = di.inject(buildVersionInitializable.stateToken);
    const currentVersion = buildVersion;
    const getLatestVersion = di.inject(getLatestVersionViaChannelInjectable);
    const logger = di.inject(loggerInjectionToken);
    const showInfoNotification = di.inject(showInfoNotificationInjectable);
    
    return async () => {
      let newVersion: string | undefined;

      try {
        newVersion = await getLatestVersion();
      } catch (error) {
        logger.error(`[WELCOME]: Failed to check latest version: ${error}`);
      }

      if (newVersion && semver.gt(newVersion, currentVersion)) {
        showInfoNotification(
          <div className="flex column gaps">
            <div>{productName} v{newVersion} is available! Open the <a href={`https://github.com/freelensapp/freelens/releases/tag/v${newVersion}`} target="_blank" rel="noreferrer" className="NotificationLink">release notes</a> to learn more.  </div>
          </div>
        );  
      }
    };
  },
});

export default newVersionNotificationInjectable;
