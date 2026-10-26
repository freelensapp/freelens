/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { podListLayoutColumnInjectionToken } from "@freelensapp/list-layout";
import { getInjectable } from "@ogre-tools/injectable";
import { getPodContainerPorts, PodPortsCell } from "../pod-ports-cell";
import { COLUMN_PRIORITY } from "./column-priority";

import type { Pod } from "@freelensapp/kube-object";

const columnId = "ports";

const podPortSortKey = (pod: Pod) => getPodContainerPorts(pod)[0]?.containerPort;

export const podsPortsColumnInjectable = getInjectable({
  id: "pods-ports-column",
  instantiate: () => ({
    id: columnId,
    kind: "Pod",
    apiVersion: "v1",
    priority: COLUMN_PRIORITY.PORTS,
    content: (pod) => <PodPortsCell pod={pod} />,
    header: { title: "Ports", className: "ports", sortBy: columnId, id: columnId },
    sortingCallBack: podPortSortKey,
  }),
  injectionToken: podListLayoutColumnInjectionToken,
});
