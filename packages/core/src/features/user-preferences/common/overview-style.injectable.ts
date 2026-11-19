/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import { defaultOverviewStylePreference } from "./preferences-helpers";
import userPreferencesStateInjectable from "./state.injectable";

/**
 * How the cluster and workloads overviews show their numbers: as cards, or as the ring and pie
 * charts. Cards until the preferences are loaded, as without a stored choice.
 */
const overviewStyleInjectable = getInjectable({
  id: "overview-style",
  instantiate: (di) => {
    const state = di.inject(userPreferencesStateInjectable);

    return computed(() => state.overviewStyle ?? defaultOverviewStylePreference);
  },
});

export default overviewStyleInjectable;
