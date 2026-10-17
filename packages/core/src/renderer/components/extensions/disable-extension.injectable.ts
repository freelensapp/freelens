/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import extensionLoaderInjectable from "../../../extensions/extension-loader/extension-loader.injectable";
import { getExtensionId, sanitizeExtensionName } from "../../../extensions/lens-extension";
import userPreferencesStateInjectable from "../../../features/user-preferences/common/state.injectable";

import type { LensExtensionId } from "../../../extensions/installed-extension";

export type DisableExtension = (extId: LensExtensionId) => Promise<void>;

const disableExtensionInjectable = getInjectable({
  id: "disable-extension",

  instantiate: (di): DisableExtension => {
    const extensionLoader = di.inject(extensionLoaderInjectable);
    const userPreferences = di.inject(userPreferencesStateInjectable);

    return async (extId) => {
      const ext = extensionLoader.getExtensionById(extId);

      if (ext) {
        // Remove extension order from user store
        if (userPreferences.clusterPageMenuOrder) {
          const extensionName = sanitizeExtensionName(getExtensionId(ext.manifest.name));
          delete userPreferences.clusterPageMenuOrder[extensionName];
        }

        await extensionLoader.setIsEnabled(extId, false);
      }
    };
  },
});

export default disableExtensionInjectable;
