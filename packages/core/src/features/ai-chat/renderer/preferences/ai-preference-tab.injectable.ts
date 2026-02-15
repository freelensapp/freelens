/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { preferenceItemInjectionToken } from "../../../preferences/renderer/preference-items/preference-item-injection-token";

const aiPreferenceTabInjectable = getInjectable({
  id: "ai-preference-tab",

  instantiate: () => ({
    kind: "tab" as const,
    id: "ai-tab",
    parentId: "general-tab-group" as const,
    pathId: "ai-assistant",
    label: "AI Assistant",
    orderNumber: 60,
  }),

  injectionToken: preferenceItemInjectionToken,
});

export default aiPreferenceTabInjectable;
