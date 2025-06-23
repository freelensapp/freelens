/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import openLinkInBrowserInjectable from "../../../../../../common/utils/open-link-in-browser.injectable";
import { supportUrl } from "../../../../../../common/vars";
import applicationMenuItemInjectionToken from "../../application-menu-item-injection-token";

const openSupportItemInjectable = getInjectable({
  id: "open-support-menu-item",

  instantiate: (di) => {
    const openLinkInBrowser = di.inject(openLinkInBrowserInjectable);
    const logger = di.inject(loggerInjectionToken);

    return {
      kind: "clickable-menu-item" as const,
      parentId: "help",
      id: "open-support",
      orderNumber: 30,
      label: "Support",

      // TODO: Convert to async/await
      onClick: () => {
        openLinkInBrowser(supportUrl).catch((error) => {
          logger.error("[MENU]: failed to open browser", { error });
        });
      },
    };
  },

  injectionToken: applicationMenuItemInjectionToken,
});

export default openSupportItemInjectable;
