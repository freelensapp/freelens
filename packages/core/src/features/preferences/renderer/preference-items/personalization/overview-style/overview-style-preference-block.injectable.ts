/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { preferenceItemInjectionToken } from "../../preference-item-injection-token";
import { OverviewStyle } from "./overview-style";

const overviewStylePreferenceBlockInjectable = getInjectable({
  id: "overview-style-preference-item",

  instantiate: () => ({
    kind: "block" as const,
    id: "overview-style",
    parentId: "personalization-page",
    orderNumber: 37,
    Component: OverviewStyle,
  }),

  injectionToken: preferenceItemInjectionToken,
});

export default overviewStylePreferenceBlockInjectable;
