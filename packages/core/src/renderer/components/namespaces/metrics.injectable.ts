/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { Namespace } from "@freelensapp/kube-object";
import { getInjectable, lifecycleEnum } from "@ogre-tools/injectable";
import { asyncComputed } from "@ogre-tools/injectable-react";
import { now } from "mobx-utils";
import requestPodMetricsInNamespaceInjectable from "../../../common/k8s-api/endpoints/metrics.api/request-pod-metrics-in-namespace.injectable";

const namespaceMetricsInjectable = getInjectable({
  id: "namespace-metrics",
  instantiate: (di, namespace) => {
    const requestPodMetricsInNamespace = di.inject(requestPodMetricsInNamespaceInjectable);

    return asyncComputed({
      getValueFromObservedPromise: async () => {
        now(60 * 1000); // Update every minute

        return requestPodMetricsInNamespace(namespace.getName());
      },
    });
  },
  lifecycle: lifecycleEnum.keyedSingleton({
    getInstanceKey: (di, namespace: Namespace) => namespace.getId(),
  }),
});

export default namespaceMetricsInjectable;
