/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable, lifecycleEnum } from "@ogre-tools/injectable";
import { asyncComputed } from "@ogre-tools/injectable-react";
import { now } from "mobx-utils";
import requestPodMetricsForDaemonSetsInjectable from "../../../common/k8s-api/endpoints/metrics.api/request-pod-metrics-for-daemon-sets.injectable";
import selectedMetricsTimeRangeInjectable from "../cluster/overview/selected-metrics-time-range.injectable";

import type { DaemonSet } from "@freelensapp/kube-object";

interface DaemonSetMetricsInjectableParams {
  daemonSet: DaemonSet;
  timeRangeKey: string;
}

const daemonSetMetricsInjectable = getInjectable({
  id: "daemon-set-metrics",
  instantiate: (di, { daemonSet }: DaemonSetMetricsInjectableParams) => {
    const requestPodMetricsForDaemonSets = di.inject(requestPodMetricsForDaemonSetsInjectable);
    const selectedMetricsTimeRange = di.inject(selectedMetricsTimeRangeInjectable);

    return asyncComputed({
      getValueFromObservedPromise: () => {
        now(60 * 1000); // update every minute
        const { start, end, range } = selectedMetricsTimeRange.timestamps.get();

        return requestPodMetricsForDaemonSets([daemonSet], daemonSet.getNs(), undefined, {
          start,
          end,
          range,
        });
      },
      betweenUpdates: "show-latest-value",
    });
  },
  lifecycle: lifecycleEnum.keyedSingleton({
    getInstanceKey: (di, { daemonSet, timeRangeKey }: DaemonSetMetricsInjectableParams) =>
      `${daemonSet.getId()}-${timeRangeKey}`,
  }),
});

export default daemonSetMetricsInjectable;
