/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { computed, reaction } from "mobx";
import customThemesStorageInjectable from "./custom-themes-storage.injectable";

const customThemesInjectable = getInjectable({
  id: "custom-themes",
  instantiate: (di) => {
    const customThemesStorage = di.inject(customThemesStorageInjectable);

    return computed(() => customThemesStorage.themes);
  },
});

export default customThemesInjectable;
