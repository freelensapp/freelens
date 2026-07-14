/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import withErrorLoggingInjectable from "../../../../../../common/utils/with-error-logging/with-error-logging.injectable";
import { withErrorSuppression } from "../../../../../../common/utils/with-error-suppression/with-error-suppression";
import { trayMenuItemInjectionToken } from "../../../../../../main/tray/tray-menu-item/tray-menu-item-injection-token";
import navigateToPreferencesInjectable from "../../../../common/navigate-to-preferences.injectable";

const openPreferencesTrayItemInjectable = getInjectable({
  id: "open-preferences-tray-item",

  instantiate: (di) => {
    const navigateToPreferences = di.inject(navigateToPreferencesInjectable);
    const withErrorLoggingFor = di.inject(withErrorLoggingInjectable);

    return {
      id: "open-preferences",
      parentId: null,
      label: computed(() => "Preferences"),
      orderNumber: 20,
      enabled: computed(() => true),
      visible: computed(() => true),

      click: withErrorSuppression(
        withErrorLoggingFor(() => "[TRAY]: Opening of preferences failed.")(navigateToPreferences),
      ),
    };
  },

  injectionToken: trayMenuItemInjectionToken,
});

export default openPreferencesTrayItemInjectable;
