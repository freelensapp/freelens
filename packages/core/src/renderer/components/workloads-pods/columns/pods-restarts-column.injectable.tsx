/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { podListLayoutColumnInjectionToken } from "@freelensapp/list-layout";
import { getInjectable } from "@ogre-tools/injectable";

const columnId = "restarts";

export const podsRestartsColumnInjectable = getInjectable({
  id: "pods-restarts-column",
  instantiate: () => ({
    id: columnId,
    kind: "Pod",
    apiVersion: "v1",
    priority: 70,
    content: (pod) => pod.getRestartsCount(),
    header: { title: "Restarts", className: "restarts", sortBy: columnId, id: columnId },
    sortingCallBack: (pod) => pod.getRestartsCount(),
  }),
  injectionToken: podListLayoutColumnInjectionToken,
});
