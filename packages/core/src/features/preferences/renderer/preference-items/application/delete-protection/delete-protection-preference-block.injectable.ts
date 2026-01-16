/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { preferenceItemInjectionToken } from "../../preference-item-injection-token";
import { DeleteProtection } from "./delete-protection";

const deleteProtectionPreferenceBlockInjectable = getInjectable({
  id: "delete-protection-preference-item",

  instantiate: () => ({
    kind: "block" as const,
    id: "delete-protection",
    parentId: "application-page",
    orderNumber: 35,
    Component: DeleteProtection,
  }),

  injectionToken: preferenceItemInjectionToken,
});

export default deleteProtectionPreferenceBlockInjectable;
