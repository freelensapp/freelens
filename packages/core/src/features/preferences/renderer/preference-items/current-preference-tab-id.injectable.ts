/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import routePathParametersInjectable from "../../../../renderer/routes/route-path-parameters.injectable";
import preferencesRouteInjectable from "../../common/preferences-route.injectable";
import preferencesRouteForExtensionsInjectable from "../../common/preferences-route-for-extensions.injectable";

const currentPreferenceTabIdInjectable = getInjectable({
  id: "current-preference-tab-id",

  instantiate: (di) => {
    const preferencesRoute = di.inject(preferencesRouteInjectable);
    const preferencesRouteForExtensions = di.inject(preferencesRouteForExtensionsInjectable);

    const preferencesRoutePathParameters = di.inject(routePathParametersInjectable, preferencesRoute);

    const extensionsRoutePathParameters = di.inject(routePathParametersInjectable, preferencesRouteForExtensions);

    return computed(() => {
      const preferenceTabId = preferencesRoutePathParameters.get().preferenceTabId;

      if (preferenceTabId) {
        return preferenceTabId;
      }

      const extensionsParameters = extensionsRoutePathParameters.get();

      if (extensionsParameters.extensionId) {
        if (extensionsParameters.preferenceTabId) {
          return `extension-${extensionsParameters.extensionId}-${extensionsParameters.preferenceTabId}`;
        }

        return extensionsParameters.extensionId;
      }

      return "app";
    });
  },
});

export default currentPreferenceTabIdInjectable;
