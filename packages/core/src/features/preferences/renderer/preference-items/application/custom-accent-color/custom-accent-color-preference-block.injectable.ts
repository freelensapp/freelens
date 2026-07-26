/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { preferenceItemInjectionToken } from "../../preference-item-injection-token";
import { CustomAccentColor } from "./custom-accent-color";

const customAccentColorPreferenceBlockInjectable = getInjectable({
  id: "custom-accent-color-preference-item",

  instantiate: () => ({
    kind: "block" as const,
    id: "custom-accent-color",
    parentId: "application-page",
    orderNumber: 11,
    Component: CustomAccentColor,
  }),

  injectionToken: preferenceItemInjectionToken,
});

export default customAccentColorPreferenceBlockInjectable;
