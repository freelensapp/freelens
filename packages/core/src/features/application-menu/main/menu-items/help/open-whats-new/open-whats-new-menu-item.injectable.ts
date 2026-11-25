/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import * as verkit from "verkit";
import openLinkInBrowserInjectable from "../../../../../../common/utils/open-link-in-browser.injectable";
import { buildVersionInitializable } from "../../../../../vars/build-version/common/token";
import applicationMenuItemInjectionToken from "../../application-menu-item-injection-token";

const releasesUrl = "https://github.com/freelensapp/freelens/releases";

/**
 * A prerelease has no release page on GitHub, and neither has a version that
 * does not parse, so both get the list of releases instead.
 */
const getWhatsNewUrl = (buildVersion: string) =>
  verkit.isStable(buildVersion) ? `${releasesUrl}/tag/v${buildVersion}` : releasesUrl;

const openWhatsNewMenuItemInjectable = getInjectable({
  id: "open-whats-new-menu-item",

  instantiate: (di) => {
    const openLinkInBrowser = di.inject(openLinkInBrowserInjectable);
    const logger = di.inject(loggerInjectionToken);
    const buildVersion = di.inject(buildVersionInitializable.stateToken);

    return {
      kind: "clickable-menu-item" as const,
      parentId: "help",
      id: "open-whats-new",
      orderNumber: 25,
      label: "What's new",

      onClick: () => {
        openLinkInBrowser(getWhatsNewUrl(buildVersion)).catch((error) => {
          logger.error("[MENU]: failed to open browser", { error });
        });
      },
    };
  },

  injectionToken: applicationMenuItemInjectionToken,
});

export default openWhatsNewMenuItemInjectable;
