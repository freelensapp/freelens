/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable, lifecycleEnum } from "@ogre-tools/injectable";
import { asyncComputed } from "@ogre-tools/injectable-react";
import { now } from "mobx-utils";
import requestIngressMetricsInjectable from "../../../common/k8s-api/endpoints/metrics.api/request-ingress-metrics.injectable";
import selectedMetricsTimeRangeInjectable from "../cluster/overview/selected-metrics-time-range.injectable";

import type { Ingress } from "@freelensapp/kube-object";

interface IngressMetricsInjectableParams {
  ingress: Ingress;
  timeRangeKey: string;
}

const ingressMetricsInjectable = getInjectable({
  id: "ingress-metrics",
  instantiate: (di, { ingress }: IngressMetricsInjectableParams) => {
    const requestIngressMetrics = di.inject(requestIngressMetricsInjectable);
    const selectedMetricsTimeRange = di.inject(selectedMetricsTimeRangeInjectable);

    return asyncComputed({
      getValueFromObservedPromise: async () => {
        now(60 * 1000); // Update every minute
        const { start, end, range } = selectedMetricsTimeRange.timestamps.get();

        return requestIngressMetrics(ingress.getName(), ingress.getNs(), {
          start,
          end,
          range,
        });
      },
      betweenUpdates: "show-latest-value",
    });
  },
  lifecycle: lifecycleEnum.keyedSingleton({
    getInstanceKey: (di, { ingress, timeRangeKey }: IngressMetricsInjectableParams) =>
      `${ingress.getId()}-${timeRangeKey}`,
  }),
});

export default ingressMetricsInjectable;
