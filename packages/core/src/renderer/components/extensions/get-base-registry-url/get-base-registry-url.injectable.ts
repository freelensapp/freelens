/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { defaultExtensionRegistryUrl } from "../../../../features/user-preferences/common/preferences-helpers";
import userPreferencesStateInjectable from "../../../../features/user-preferences/common/state.injectable";

const getBaseRegistryUrlInjectable = getInjectable({
  id: "get-base-registry-url",

  instantiate: (di) => {
    const { extensionRegistryUrl } = di.inject(userPreferencesStateInjectable);

    return async () => {
      switch (extensionRegistryUrl.location) {
        case "custom":
          return extensionRegistryUrl.customUrl;

        default:
        case "default":
          return defaultExtensionRegistryUrl;
      }
    };
  },
});

export default getBaseRegistryUrlInjectable;
