/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { preferenceItemInjectionToken } from "../../preference-item-injection-token";
import { ThemeVariant } from "./theme-variant";

const themeVariantPreferenceBlockInjectable = getInjectable({
  id: "theme-variant-preference-item",

  instantiate: () => ({
    kind: "block" as const,
    id: "theme-variant",
    parentId: "personalization-page",
    orderNumber: 20,
    Component: ThemeVariant,
  }),

  injectionToken: preferenceItemInjectionToken,
});

export default themeVariantPreferenceBlockInjectable;
