/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { getOperatorLikeQueryFor } from "./operator-provider.injectable";
import { createPrometheusProvider, findNamespacedService, prometheusProviderInjectionToken } from "./provider";

const openshiftPrometheusProviderInjectable = getInjectable({
  id: "openshift-prometheus-provider",
  instantiate: () =>
    createPrometheusProvider({
      kind: "openshift",
      name: "OpenShift",
      isConfigurable: true,
      getQuery: getOperatorLikeQueryFor({ rateAccuracy: "1m" }),
      getService: (client) => findNamespacedService(client, "prometheus-k8s", "openshift-monitoring"),
    }),
  injectionToken: prometheusProviderInjectionToken,
});

export default openshiftPrometheusProviderInjectable;
