/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import userPreferencesStateInjectable from "../../user-preferences/common/state.injectable";

const aiToolIsSelectedInjectable = getInjectable({
  id: "ai-tool-is-selected",

  instantiate: (di) => {
    const preferences = di.inject(userPreferencesStateInjectable);

    return computed(() => Boolean(preferences.aiTool));
  },
});

export default aiToolIsSelectedInjectable;
