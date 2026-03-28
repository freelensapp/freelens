/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import userPreferencesStateInjectable from "./state.injectable";

const customAccentColorInjectable = getInjectable({
  id: "custom-accent-color",
  instantiate: (di) => {
    const state = di.inject(userPreferencesStateInjectable);

    return computed(() => state.customAccentColor);
  },
});

export default customAccentColorInjectable;
