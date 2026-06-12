/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import navigateToLicensesInjectable from "../../../../../licenses/common/navigate-to-licenses.injectable";
import applicationMenuItemInjectionToken from "../../application-menu-item-injection-token";

const openLicensesMenuItemInjectable = getInjectable({
  id: "open-licenses-menu-item",

  instantiate: (di) => {
    const navigateToLicenses = di.inject(navigateToLicensesInjectable);
    const logger = di.inject(loggerInjectionToken);

    return {
      kind: "clickable-menu-item" as const,
      parentId: "help",
      id: "open-licenses",
      orderNumber: 30,
      label: "Licenses",

      onClick: () => {
        try {
          navigateToLicenses();
        } catch (error) {
          logger.error("[MENU]: exception navigating to licenses", { error });
        }
      },
    };
  },

  injectionToken: applicationMenuItemInjectionToken,
});

export default openLicensesMenuItemInjectable;
