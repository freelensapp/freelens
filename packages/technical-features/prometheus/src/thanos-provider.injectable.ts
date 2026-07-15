/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { getOperatorLikeQueryFor } from "./operator-provider.injectable";
import {
  createPrometheusProvider,
  findFirstNamespacedService,
  prometheusProviderInjectionToken,
} from "./provider";

const thanosPrometheusProviderInjectable = getInjectable({
  id: "thanos-prometheus-provider",
  instantiate: () =>
    createPrometheusProvider({
      kind: "thanos",
      name: "Thanos",
      isConfigurable: true,
      // Thanos Query typically federates Prometheus instances managed by the
      // Prometheus Operator (kube-prometheus-stack), so it shares the same
      // label conventions and PromQL as the operator provider.
      getQuery: getOperatorLikeQueryFor({ rateAccuracy: "1m" }),
      getService: (client) =>
        findFirstNamespacedService(
          client,
          "app.kubernetes.io/name=thanos-query",
          "app.kubernetes.io/name=thanos,app.kubernetes.io/component=query",
          "app.kubernetes.io/component=query-layer",
          "app=thanos-query",
        ),
    }),
  injectionToken: prometheusProviderInjectionToken,
});

export default thanosPrometheusProviderInjectable;
