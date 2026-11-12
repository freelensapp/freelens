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

// Thanos aggregates node-exporter / kube-state-metrics series. Across clusters
// the node-exporter relabeling is not consistent: some clusters add a `node`
// label to those series, others expose only `instance`. In both cases, though,
// node-exporter's `instance` IS the node name (not `<ip>:9100`). The Helm/
// operator styles filter and group node-exporter metrics by `node`, so on any
// cluster that omits that label every node metric (CPU, memory, disk) comes
// back empty. We therefore key all node-exporter queries on `instance`, which
// works whether or not `node` is present.
//
// Kube-state-metrics series (capacity/allocatable, `kube_pod_info`) always
// carry a real `node` label, so those keep using `node`.
//
// Two queries also need their source swapped, because the Helm/operator styles
// derive them from kubelet-scraped metrics (cAdvisor / `kubelet_*`) whose
// `instance` is `<node-ip>:10250` and which carry no usable node identifier:
//
//   - `workloadMemoryUsage` feeds the node list/detail memory bar. We derive
//     node memory usage from node-exporter (`MemTotal - MemAvailable`).
//   - `podUsage` feeds the node detail Pods chart. We count pods per node from
//     kube-state-metrics' `kube_pod_info`.
export const getThanosLikeQueryFor = ({
  rateAccuracy,
}: {
  rateAccuracy: string;
}): PrometheusProvider["getQuery"] => {
  const getHelmQuery = getHelmLikeQueryFor({ rateAccuracy });

  return (opts, queryName) => {
    // node memory used, keyed by `instance` (== node name for node-exporter)
    const nodeMemoryUsed =
      opts.category === "cluster"
        ? `sum(node_memory_MemTotal_bytes{instance=~"${opts.nodes}"} - node_memory_MemAvailable_bytes{instance=~"${opts.nodes}"}) by (instance)`
        : `sum(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) by (instance)`;

    switch (opts.category) {
      case "cluster":
        switch (queryName) {
          case "memoryUsage":
          case "workloadMemoryUsage":
            return nodeMemoryUsed;
          case "cpuUsage":
            return `sum(rate(node_cpu_seconds_total{instance=~"${opts.nodes}", mode=~"user|system"}[${rateAccuracy}])) by (instance)`;
          case "fsSize":
            return `sum(node_filesystem_size_bytes{instance=~"${opts.nodes}", mountpoint=~"${opts.mountpoints}"}) by (instance)`;
          case "fsUsage":
            return `sum(node_filesystem_size_bytes{instance=~"${opts.nodes}", mountpoint=~"${opts.mountpoints}"} - node_filesystem_avail_bytes{instance=~"${opts.nodes}", mountpoint=~"${opts.mountpoints}"}) by (instance)`;
          case "podUsage":
            return `count(kube_pod_info{node=~"${opts.nodes}"}) by (node)`;
        }
        break;
      case "nodes":
        switch (queryName) {
          case "memoryUsage":
          case "workloadMemoryUsage":
            return nodeMemoryUsed;
          case "cpuUsage":
            return `sum(rate(node_cpu_seconds_total{mode=~"user|system"}[${rateAccuracy}])) by (instance)`;
          case "fsSize":
            return `sum(node_filesystem_size_bytes{mountpoint=~"${opts.mountpoints}"}) by (instance)`;
          case "fsUsage":
            return `sum(node_filesystem_size_bytes{mountpoint=~"${opts.mountpoints}"} - node_filesystem_avail_bytes{mountpoint=~"${opts.mountpoints}"}) by (instance)`;
          case "podUsage":
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
