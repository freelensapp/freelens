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

import type { PrometheusProvider } from "./provider";

// Thanos federates node-exporter / kube-state-metrics series that carry a
// direct `node` label but no `pod`/`namespace`, so the Helm-style queries
// (which select node-exporter metrics directly and group `by (node)`) match
// this schema — unlike the operator style, whose `kube_pod_info` join on
// `pod`/`namespace` would return nothing here and yield 0% everywhere.
//
// The one exception is `workloadMemoryUsage`, which the Helm/operator styles
// derive from cAdvisor's `container_memory_working_set_bytes`. On typical
// Thanos setups those container series are labelled only with `instance`
// (`<node-ip>:10250`) and carry no `node` label, so neither the Helm
// `instance=~"<node-name>"` filter nor a `by (node)` grouping can identify a
// node — the node list/detail memory bar (which reads `workloadMemoryUsage`)
// stays empty. We instead derive node memory usage from node-exporter
// (`MemTotal - MemAvailable`), which is keyed by `node` and lines up with how
// Freelens filters by node name.
export const getThanosLikeQueryFor = ({
  rateAccuracy,
}: {
  rateAccuracy: string;
}): PrometheusProvider["getQuery"] => {
  const getHelmQuery = getHelmLikeQueryFor({ rateAccuracy });

  return (opts, queryName) => {
    if (queryName === "workloadMemoryUsage") {
      switch (opts.category) {
        case "cluster":
          return `sum(node_memory_MemTotal_bytes{node=~"${opts.nodes}"} - node_memory_MemAvailable_bytes{node=~"${opts.nodes}"}) by (node)`;
        case "nodes":
          return `sum(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) by (node)`;
      }
    }

    return getHelmQuery(opts, queryName);
  };
};

const thanosPrometheusProviderInjectable = getInjectable({
  id: "thanos-prometheus-provider",
  instantiate: () =>
    createPrometheusProvider({
      kind: "thanos",
      name: "Thanos",
      isConfigurable: true,
      getQuery: getThanosLikeQueryFor({ rateAccuracy: "5m" }),
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
