/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { DaemonSet } from "@freelensapp/kube-object";
import { getInjectable, lifecycleEnum } from "@ogre-tools/injectable";
import { asyncComputed } from "@ogre-tools/injectable-react";
import { now } from "mobx-utils";
import requestPodMetricsForDaemonSetsInjectable from "../../../common/k8s-api/endpoints/metrics.api/request-pod-metrics-for-daemon-sets.injectable";

const daemonSetMetricsInjectable = getInjectable({
  id: "daemon-set-metrics",
  instantiate: (di, daemonSet) => {
    const requestPodMetricsForDaemonSets = di.inject(requestPodMetricsForDaemonSetsInjectable);

    return asyncComputed({
      getValueFromObservedPromise: () => {
        now(60 * 1000); // update every minute

        return requestPodMetricsForDaemonSets([daemonSet], daemonSet.getNs());
      },
    });
  },
  lifecycle: lifecycleEnum.keyedSingleton({
    getInstanceKey: (di, daemonSet: DaemonSet) => daemonSet.getId(),
  }),
});

export default daemonSetMetricsInjectable;
