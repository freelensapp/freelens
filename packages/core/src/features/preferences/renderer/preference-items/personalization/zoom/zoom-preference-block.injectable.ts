/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { preferenceItemInjectionToken } from "../../preference-item-injection-token";
import { Zoom } from "./zoom";

const zoomPreferenceBlockInjectable = getInjectable({
  id: "zoom-preference-item",

  instantiate: () => ({
    kind: "block" as const,
    id: "zoom",
    parentId: "personalization-page",
    orderNumber: 35,
    Component: Zoom,
  }),

  injectionToken: preferenceItemInjectionToken,
});

export default zoomPreferenceBlockInjectable;
