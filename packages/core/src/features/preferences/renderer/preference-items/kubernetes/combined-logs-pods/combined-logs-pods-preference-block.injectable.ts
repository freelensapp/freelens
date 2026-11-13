/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { preferenceItemInjectionToken } from "../../preference-item-injection-token";
import { CombinedLogsPods } from "./combined-logs-pods";

const combinedLogsPodsPreferenceBlockInjectable = getInjectable({
  id: "combined-logs-pods-preference-item",

  instantiate: () => ({
    kind: "block" as const,
    id: "combined-logs-pods",
    parentId: "kubernetes-page",
    orderNumber: 40,
    Component: CombinedLogsPods,
  }),

  injectionToken: preferenceItemInjectionToken,
});

export default combinedLogsPodsPreferenceBlockInjectable;
