/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import extensionLoaderInjectable from "../../../extensions/extension-loader/extension-loader.injectable";

import type { LensExtensionId } from "../../../extensions/installed-extension";

export type EnableExtension = (extId: LensExtensionId) => Promise<void>;

const enableExtensionInjectable = getInjectable({
  id: "enable-extension",

  instantiate: (di): EnableExtension => {
    const extensionLoader = di.inject(extensionLoaderInjectable);

    return async (extId) => {
      if (extensionLoader.getExtensionById(extId)) {
        await extensionLoader.setIsEnabled(extId, true);
      }
    };
  },
});

export default enableExtensionInjectable;
