/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { podListLayoutColumnInjectionToken } from "@freelensapp/list-layout";
import { getInjectable } from "@ogre-tools/injectable";
import React from "react";
import { KubeObjectStatusIcon } from "../../kube-object-status-icon";
import { COLUMN_PRIORITY } from "./column-priority";

const columnId = "qos";

export const podsQosColumnInjectable = getInjectable({
  id: "pods-status-icon-column",
  instantiate: () => ({
    id: columnId,
    kind: "Pod",
    apiVersion: "v1",
    priority: COLUMN_PRIORITY.STATUS_ICON,
    content: (pod) => <KubeObjectStatusIcon key="icon" object={pod} />,
    header: { className: "warning", showWithColumn: "name" },
    sortingCallBack: (pod) => pod.getQosClass(),
  }),
  injectionToken: podListLayoutColumnInjectionToken,
});
