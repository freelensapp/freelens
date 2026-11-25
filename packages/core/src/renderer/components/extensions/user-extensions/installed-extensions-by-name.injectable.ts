/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import extensionLoaderInjectable from "../../../../extensions/extension-loader/extension-loader.injectable";

import type { InstalledExtension } from "../../../../extensions/installed-extension";

const installedExtensionsByNameInjectable = getInjectable({
  id: "installed-extensions-by-name",
  instantiate: (di) => {
    const loader = di.inject(extensionLoaderInjectable);
    return computed(() => {
      const map = new Map<string, InstalledExtension>();
      for (const ext of loader.userExtensions.get().values()) {
        map.set(ext.manifest.name, ext);
      }
      return map;
    });
  },
});

export default installedExtensionsByNameInjectable;
