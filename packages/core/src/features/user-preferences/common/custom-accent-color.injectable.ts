/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import { defaultAccentColor } from "../../../common/vars";
import userPreferencesStateInjectable from "./state.injectable";

const customAccentColorPreferenceInjectable = getInjectable({
  id: "custom-accent-color-preference",
  instantiate: (di) => {
    const state = di.inject(userPreferencesStateInjectable);

    return computed((): string => state.customAccentColor || defaultAccentColor);
  },
});

export default customAccentColorPreferenceInjectable;
