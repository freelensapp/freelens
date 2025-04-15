/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { Pod } from "@freelensapp/kube-object";
import { getInjectable, lifecycleEnum } from "@ogre-tools/injectable";
import { asyncComputed } from "@ogre-tools/injectable-react";
import { now } from "mobx-utils";
import requestPodMetricsInjectable from "../../../common/k8s-api/endpoints/metrics.api/request-pod-metrics.injectable";

const podMetricsInjectable = getInjectable({
  id: "pod-metrics",
  instantiate: (di, pod) => {
    const requestPodMetrics = di.inject(requestPodMetricsInjectable);

    return asyncComputed({
      getValueFromObservedPromise: () => {
        now(60 * 1000);

        return requestPodMetrics([pod], pod.getNs());
      },
    });
  },
  lifecycle: lifecycleEnum.keyedSingleton({
    getInstanceKey: (di, pod: Pod) => pod.getId(),
  }),
});

export default podMetricsInjectable;
