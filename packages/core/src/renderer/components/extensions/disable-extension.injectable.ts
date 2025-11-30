/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import extensionLoaderInjectable from "../../../extensions/extension-loader/extension-loader.injectable";

import type { LensExtensionId } from "@freelensapp/legacy-extensions";
import userPreferencesStateInjectable from "../../../features/user-preferences/common/state.injectable";
import { getExtensionId, sanitizeExtensionName } from "../../../extensions/lens-extension";

export type DisableExtension = (extId: LensExtensionId) => void;

const disableExtensionInjectable = getInjectable({
  id: "disable-extension",

  instantiate: (di): DisableExtension => {
    const extensionLoader = di.inject(extensionLoaderInjectable);
    const userPreferences = di.inject(userPreferencesStateInjectable);

    return (extId) => {
      const ext = extensionLoader.getExtensionById(extId);

      if (ext && !ext.isBundled) {
        ext.isEnabled = false;

        // Remove extension order from user store
        if (userPreferences.clusterPageMenuOrder) {
          const extensionName = sanitizeExtensionName(getExtensionId(ext.manifest.name));
          delete userPreferences.clusterPageMenuOrder[extensionName];
        }
      }
    };
  },
});

export default disableExtensionInjectable;
