/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable, lifecycleEnum } from "@ogre-tools/injectable";
import { asyncComputed } from "@ogre-tools/injectable-react";
import { now } from "mobx-utils";
import requestPodMetricsInNamespaceInjectable from "../../../common/k8s-api/endpoints/metrics.api/request-pod-metrics-in-namespace.injectable";
import selectedMetricsTimeRangeInjectable from "../cluster/overview/selected-metrics-time-range.injectable";

import type { Namespace } from "@freelensapp/kube-object";

interface NamespaceMetricsInjectableParams {
  namespace: Namespace;
  timeRangeKey: string;
}

const namespaceMetricsInjectable = getInjectable({
  id: "namespace-metrics",
  instantiate: (di, { namespace }: NamespaceMetricsInjectableParams) => {
    const requestPodMetricsInNamespace = di.inject(requestPodMetricsInNamespaceInjectable);
    const selectedMetricsTimeRange = di.inject(selectedMetricsTimeRangeInjectable);

    return asyncComputed({
      getValueFromObservedPromise: async () => {
        now(60 * 1000); // Update every minute
        const { start, end, range } = selectedMetricsTimeRange.timestamps.get();

        return requestPodMetricsInNamespace(namespace.getName(), undefined, {
          start,
          end,
          range,
        });
      },
      betweenUpdates: "show-latest-value",
    });
  },
  lifecycle: lifecycleEnum.keyedSingleton({
    getInstanceKey: (di, { namespace, timeRangeKey }: NamespaceMetricsInjectableParams) =>
      `${namespace.getId()}-${timeRangeKey}`,
  }),
});

export default namespaceMetricsInjectable;
