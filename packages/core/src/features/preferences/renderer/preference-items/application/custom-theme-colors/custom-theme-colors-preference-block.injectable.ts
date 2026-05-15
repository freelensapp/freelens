/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { preferenceItemInjectionToken } from "../../../preference-item-injection-token";
import { CustomThemeColors } from "./custom-theme-colors";

const customThemeColorsPreferenceBlockInjectable = getInjectable({
  id: "custom-theme-colors-preference-item",

  instantiate: () => ({
    kind: "block" as const,
    id: "custom-theme-colors",
    parentId: "application-page",
    orderNumber: 20,
    Component: CustomThemeColors,
  }),

  injectionToken: preferenceItemInjectionToken,
});

export default customThemeColorsPreferenceBlockInjectable;
