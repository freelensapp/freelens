/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import requestPodMetricsForDaemonSetsInjectable from "../../../common/k8s-api/endpoints/metrics.api/request-pod-metrics-for-daemon-sets.injectable";
import { createTimeRangedMetricsInjectable } from "../resource-metrics/create-time-ranged-metrics";

import type { DaemonSet } from "@freelensapp/kube-object";

interface DaemonSetMetricsInjectableParams {
  daemonSet: DaemonSet;
}

const daemonSetMetricsInjectable = createTimeRangedMetricsInjectable({
  id: "daemon-set-metrics",
  getObject: ({ daemonSet }: DaemonSetMetricsInjectableParams) => daemonSet,
  getObjectId: (daemonSet) => daemonSet.getId(),
  request: ({ di, object: daemonSet, start, end, range }) =>
    di.inject(requestPodMetricsForDaemonSetsInjectable)([daemonSet], daemonSet.getNs(), undefined, {
      start,
      end,
      range,
    }),
});

export default daemonSetMetricsInjectable;
