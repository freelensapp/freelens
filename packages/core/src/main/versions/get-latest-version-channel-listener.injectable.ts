/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getRequestChannelListenerInjectable } from "@freelensapp/messaging";
import { loggerInjectionToken } from "@freelensapp/logger";
import getLatestVersionInjectable from "../../common/utils/get-latest-version.injectable";
import { getLatestVersionChannel } from "../../common/utils/get-latest-version-channel";

const getLatestVersionChannelListenerInjectable = getRequestChannelListenerInjectable({
  id: "get-latest-version-channel-listener",
  channel: getLatestVersionChannel,
  getHandler: (di) => {
    const getLatestVersion = di.inject(getLatestVersionInjectable);
    const logger = di.inject(loggerInjectionToken);

    return async () => {
      try {
        return await getLatestVersion("@freelensapp/core");
      } catch (error) {
        logger.error(`[GET-LATEST-VERSION]: Failed to fetch latest version`, { error });

        return undefined;
      }
    };
  },
});

export default getLatestVersionChannelListenerInjectable;