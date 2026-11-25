/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { preferenceItemInjectionToken } from "../preference-item-injection-token";

const personalizationPreferenceTabInjectable = getInjectable({
  id: "personalization-preference-tab",

  instantiate: () => ({
    kind: "tab" as const,
    id: "personalization-tab",
    parentId: "general-tab-group" as const,
    pathId: "personalization",
    label: "Personalization",
    orderNumber: 15,
  }),

  injectionToken: preferenceItemInjectionToken,
});

export default personalizationPreferenceTabInjectable;
