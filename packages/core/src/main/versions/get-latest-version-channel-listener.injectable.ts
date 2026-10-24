/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { getRequestChannelListenerInjectable } from "@freelensapp/messaging";
import { getLatestVersionChannel } from "../../common/utils/get-latest-version-channel";
import getLatestVersionInjectable from "./get-latest-version.injectable";

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
