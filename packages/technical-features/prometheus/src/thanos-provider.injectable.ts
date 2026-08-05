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
// Two queries need overriding because the Helm/operator styles derive them
// from kubelet-scraped metrics (cAdvisor / `kubelet_*`). On typical Thanos
// setups those series are labelled only with `instance` (`<node-ip>:10250`)
// and carry no `node` label, so neither the Helm `instance=~"<node-name>"`
// filter nor a `by (node)` grouping can identify a node:
//
//   - `workloadMemoryUsage` (from `container_memory_working_set_bytes`) feeds
//     the node list/detail memory bar. We derive node memory usage from
//     node-exporter (`MemTotal - MemAvailable`), keyed by `node`.
//   - `podUsage` (from `kubelet_running_pod_count`/`kubelet_running_pods`)
//     feeds the node detail Pods chart. We count pods per node from
//     kube-state-metrics' `kube_pod_info`, which carries a `node` label.
//
// Both replacements key on `node`, lining up with how Freelens filters node
// metrics by node name.
export const getThanosLikeQueryFor = ({
  rateAccuracy,
}: {
  rateAccuracy: string;
}): PrometheusProvider["getQuery"] => {
  const getHelmQuery = getHelmLikeQueryFor({ rateAccuracy });

  return (opts, queryName) => {
    switch (queryName) {
      case "workloadMemoryUsage":
        switch (opts.category) {
          case "cluster":
            return `sum(node_memory_MemTotal_bytes{node=~"${opts.nodes}"} - node_memory_MemAvailable_bytes{node=~"${opts.nodes}"}) by (node)`;
          case "nodes":
            return `sum(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) by (node)`;
        }
        break;
      case "podUsage":
        switch (opts.category) {
          case "cluster":
            return `count(kube_pod_info{node=~"${opts.nodes}"}) by (node)`;
          case "nodes":
            return `count(kube_pod_info) by (node)`;
        }
        break;
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
