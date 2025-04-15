import { pipeline } from "@ogre-tools/fp";
/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import withErrorLoggingInjectable from "../../../../common/utils/with-error-logging/with-error-logging.injectable";
import { withErrorSuppression } from "../../../../common/utils/with-error-suppression/with-error-suppression";
import productNameInjectable from "../../../../common/vars/product-name.injectable";
import showApplicationWindowInjectable from "../../../start-main-application/lens-window/show-application-window.injectable";
import { trayMenuItemInjectionToken } from "../tray-menu-item-injection-token";

const openAppTrayItemInjectable = getInjectable({
  id: "open-app-tray-item",

  instantiate: (di) => {
    const productName = di.inject(productNameInjectable);
    const showApplicationWindow = di.inject(showApplicationWindowInjectable);
    const withErrorLoggingFor = di.inject(withErrorLoggingInjectable);

    return {
      id: "open-app",
      parentId: null,
      label: computed(() => `Open ${productName}`),
      orderNumber: 10,
      enabled: computed(() => true),
      visible: computed(() => true),

      click: pipeline(
        showApplicationWindow,
        withErrorLoggingFor(() => "[TRAY]: Opening of application window failed."),
        withErrorSuppression,
      ),
    };
  },

  injectionToken: trayMenuItemInjectionToken,
});

export default openAppTrayItemInjectable;
