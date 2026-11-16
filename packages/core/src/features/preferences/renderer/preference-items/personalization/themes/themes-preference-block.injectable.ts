/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { preferenceItemInjectionToken } from "../../preference-item-injection-token";
import { Themes } from "./themes";

const themesPreferenceBlockInjectable = getInjectable({
  id: "themes-preference-item",

  instantiate: () => ({
    kind: "block" as const,
    id: "themes",
    parentId: "personalization-page",
    orderNumber: 40,
    Component: Themes,
  }),

  injectionToken: preferenceItemInjectionToken,
});

export default themesPreferenceBlockInjectable;
