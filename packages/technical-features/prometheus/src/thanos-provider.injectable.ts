/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { getHelmLikeQueryFor } from "./helm-provider.injectable";
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
      // Thanos federates node-exporter/kube-state-metrics data whose series
      // carry a direct `node` label but no `pod`/`namespace`. The Helm-style
      // queries select node-exporter metrics directly and group `by (node)`
      // without a `kube_pod_info` join, matching that schema. The operator
      // style (which joins on `pod`/`namespace`) would match nothing here and
      // yield 0% for CPU/memory/disk. A 5m rate window suits Thanos, which may
      // serve downsampled data.
      getQuery: getHelmLikeQueryFor({ rateAccuracy: "5m" }),
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
