/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { getHelmLikeQueryFor } from "./helm-provider.injectable";
import { prometheusProviderInjectionToken } from "./provider";

import type { PrometheusProvider, PrometheusService } from "./provider";

/**
 * Mimir is a Prometheus-compatible remote metrics backend. It does not run as
 * an in-cluster Kubernetes service — queries go to an external URL configured
 * via `directUrl` in cluster preferences. The `getPrometheusService` method
 * returns a synthetic placeholder so that the handler can resolve a provider
 * without requiring a real in-cluster service.
 */
export const mimirPrometheusProvider: PrometheusProvider = {
  kind: "mimir",
  name: "Mimir (External Endpoint)",
  isConfigurable: true,

  getQuery: getHelmLikeQueryFor({ rateAccuracy: "5m" }),

  async getPrometheusService(): Promise<PrometheusService> {
    return {
      kind: "mimir",
      namespace: "",
      service: "",
      port: 0,
    };
  },
};

const mimirPrometheusProviderInjectable = getInjectable({
  id: "mimir-prometheus-provider",
  instantiate: () => mimirPrometheusProvider,
  injectionToken: prometheusProviderInjectionToken,
});

export default mimirPrometheusProviderInjectable;
