/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { podListLayoutColumnInjectionToken } from "@freelensapp/list-layout";
import { getInjectable } from "@ogre-tools/injectable";
import { kebabCase } from "lodash";

const columnId = "status";

export const podsStatusColumnInjectable = getInjectable({
  id: "pods-status-column",
  instantiate: () => ({
    id: columnId,
    kind: "Pod",
    apiVersion: "v1",
    priority: 0,
    content: (pod) => ({
      title: pod.getStatusMessage(),
      className: kebabCase(pod.getStatusMessage()),
    }),
    header: { title: "Status", className: "status", sortBy: columnId, id: columnId },
    sortingCallBack: (pod) => pod.getStatusMessage(),
    searchFilter: (pod) => pod.getStatusMessage(),
  }),
  injectionToken: podListLayoutColumnInjectionToken,
});
