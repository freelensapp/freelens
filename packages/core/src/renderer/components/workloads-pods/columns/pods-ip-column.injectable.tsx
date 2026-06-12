/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { podListLayoutColumnInjectionToken } from "@freelensapp/list-layout";
import { getInjectable } from "@ogre-tools/injectable";
import React from "react";
import { WithTooltip } from "../../with-tooltip";
import { COLUMN_PRIORITY } from "./column-priority";

const columnId = "ip";

export const podsipColumnInjectable = getInjectable({
  id: "pods-ip-column",
  instantiate: () => ({
    id: columnId,
    kind: "Pod",
    apiVersion: "v1",
    priority: COLUMN_PRIORITY.IP,
    content: (pod) => <WithTooltip>{pod.status?.podIP}</WithTooltip>,
    header: { title: "IP", className: "ip", sortBy: columnId, id: columnId },
    sortingCallBack: (pod) => pod.status?.podIP,
  }),
  injectionToken: podListLayoutColumnInjectionToken,
});
