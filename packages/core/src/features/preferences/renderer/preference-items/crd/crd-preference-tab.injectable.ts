/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { preferenceItemInjectionToken } from "../preference-item-injection-token";

const crdPreferenceTabInjectable = getInjectable({
  id: "crd-preference-tab",

  instantiate: () => ({
    kind: "tab" as const,
    id: "crd-tab",
    parentId: "general-tab-group" as const,
    pathId: "crd",
    label: "CRDs",
    orderNumber: 60,
  }),

  injectionToken: preferenceItemInjectionToken,
});

export default crdPreferenceTabInjectable;
