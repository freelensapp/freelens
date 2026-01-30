/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { preferenceItemInjectionToken } from "../../preference-item-injection-token";
import { CheckForUpdates } from "./check-for-updates";

const checkForUpdatesPreferenceBlockInjectable = getInjectable({
  id: "check-for-updates-preference-item",

  instantiate: () => ({
    kind: "block" as const,
    id: "check-for-updates",
    parentId: "application-page",
    orderNumber: 40,
    Component: CheckForUpdates,
  }),

  injectionToken: preferenceItemInjectionToken,
});

export default checkForUpdatesPreferenceBlockInjectable;
