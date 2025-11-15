/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import customThemesStorageInjectable from "./custom-themes-storage.injectable";
import { beforeFrameStartsSecondInjectionToken } from "../before-frame-starts/tokens";

const loadCustomThemesInjectable = getInjectable({
  id: "load-custom-themes",
  instantiate: (di) => ({
    run: () => {
      // This triggers the loading of custom themes from storage
      const customThemesStorage = di.inject(customThemesStorageInjectable);
      
      // Access themes to ensure storage is loaded
      const _ = customThemesStorage.themes;
    },
  }),
  injectionToken: beforeFrameStartsSecondInjectionToken,
});

export default loadCustomThemesInjectable;
