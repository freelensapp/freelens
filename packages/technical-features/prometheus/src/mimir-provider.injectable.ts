/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { getHelmLikeQueryFor } from "./helm-provider.injectable";
import { createPrometheusProvider, findFirstNamespacedService, prometheusProviderInjectionToken } from "./provider";

const mimirPrometheusProviderInjectable = getInjectable({
  id: "mimir-prometheus-provider",
  instantiate: () =>
    createPrometheusProvider({
      kind: "mimir",
      name: "Mimir",
      isConfigurable: true,
      getQuery: getHelmLikeQueryFor({ rateAccuracy: "5m" }),
      getService: (client) =>
        findFirstNamespacedService(
          client,
          "app.kubernetes.io/name=mimir,app.kubernetes.io/component=query-frontend",
          "app.kubernetes.io/name=mimir",
          "app=mimir,component=query-frontend",
        ),
    }),
  injectionToken: prometheusProviderInjectionToken,
});

export default mimirPrometheusProviderInjectable;
