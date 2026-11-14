/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { preferenceItemInjectionToken } from "../preference-item-injection-token";

const externalToolsTabInjectable = getInjectable({
  id: "external-tools-tab",

  instantiate: () => ({
    kind: "tab" as const,
    id: "external-tools-tab",
    pathId: "external-tools",
    parentId: "general-tab-group" as const,
    label: "External Tools",
    orderNumber: 70,
  }),

  injectionToken: preferenceItemInjectionToken,
});

export default externalToolsTabInjectable;
