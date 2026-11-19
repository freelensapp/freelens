/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import {
  gkeClusterNameAnnotation,
  gkePrometheusProviderKind,
  gmpFrontendAppLabels,
  gmpFrontendImage,
  gmpFrontendNamespaces,
  gmpFrontendServiceNames,
} from "./gke-frontend";
import { createPrometheusProvider, prometheusProviderInjectionToken } from "./provider";

import type { CoreV1Api, V1Service } from "@kubernetes/client-node";

import type { GetPrometheusQuery, PrometheusServiceInfo } from "./provider";

/**
 * The query option that carries the value of `gkeClusterNameAnnotation`.
 */
export const gkeClusterNameQueryOpt = "gkeClusterName";

const rateAccuracy = "5m";

/**
 * The names of the GKE labels for the labels Freelens filters on and groups by.
 */
const gkeLabelNames: Partial<Record<string, string>> = {
  namespace: "namespace_name",
  pod: "pod_name",
  container: "container_name",
  node: "node_name",
};

/**
 * The node name is a resource label of `k8s_node` only. The series of `k8s_container` and `k8s_pod` carry it as
 * system metadata, which the PromQL API exposes with the `metadata_system_` prefix.
 */
const metadataNodeNameLabel = "metadata_system_node_name";

type MonitoredResource = "k8s_container" | "k8s_pod" | "k8s_node";

const quote = (value: string) => `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;

const metric = (path: string) => `kubernetes_io:${path}`;

const series = (
  opts: Record<string, string>,
  path: string,
  resource: MonitoredResource,
  matchers: string[] = [],
): string => {
  const all = [`monitored_resource="${resource}"`, ...matchers];
  const clusterName = opts[gkeClusterNameQueryOpt];

  if (clusterName) {
    all.push(`cluster_name=${quote(clusterName)}`);
  }

  return `${metric(path)}{${all.join(",")}}`;
};

const nodeMatchers = (opts: Record<string, string>, resource: MonitoredResource): string[] =>
  opts.nodes ? [`${resource === "k8s_node" ? "node_name" : metadataNodeNameLabel}=~"${opts.nodes}"`] : [];

const podMatchers = (opts: Record<string, string>, resource: MonitoredResource): string[] => [
  `pod_name=~"${opts.pods}"`,
  `namespace_name="${opts.namespace}"`,
  ...(resource === "k8s_container" && opts.container ? [`container_name="${opts.container}"`] : []),
];

const rate = (expr: string) => `rate(${expr}[${rateAccuracy}])`;

/**
 * Puts on each container series of `expr` the node of its pod. The series of init containers, the native sidecars
 * among them, carry no node name in their metadata, so a filter or a sum by it would leave out what they request and
 * use. The node is taken from the container of the pod that started last, so that a pod that moved to another node
 * within the window joins one node, not two, which would fail the whole query. `nodeMatcher` selects the nodes.
 *
 * `expr` is summed by pod first, so the result has one series for each pod. Under `sum by` of the node, a range query
 * of GMP fails on the series of the containers of one pod with "grouping labels must ensure unique matches", which an
 * instant query and the bare join do not.
 */
const withNodeOfPod = (opts: Record<string, string>, expr: string, nodeMatcher: string): string => {
  const uptime = series(opts, "container_uptime", "k8s_container", [nodeMatcher]);

  return `sum by (namespace_name, pod_name) (${expr}) * on (namespace_name, pod_name) group_left (${metadataNodeNameLabel}) (0 * bottomk by (namespace_name, pod_name) (1, ${uptime}) + 1)`;
};

const parseSelector = (selector: string | undefined): string[] =>
  (selector ?? "")
    .split(",")
    .map((label) => label.trim())
    .filter(Boolean);

/**
 * Sums `expr` by the labels Freelens expects, which GKE names differently: it sums by the GKE labels, renames them,
 * and sums again by the new names, so the result carries exactly the labels asked for. `names` maps a label to its
 * GKE name when the series carry it under another one than `gkeLabelNames` says.
 */
export const sumBy = (expr: string, labels: string[], names: Partial<Record<string, string>> = {}): string => {
  const sources = labels.map((label) => names[label] ?? gkeLabelNames[label] ?? label);
  const aggregated = `sum by (${sources.join(", ")}) (${expr})`;
  const renamed = labels.reduce(
    (inner, label, index) =>
      label === sources[index] ? inner : `label_replace(${inner}, "${label}", "$1", "${sources[index]}", "(.*)")`,
    aggregated,
  );

  return renamed === aggregated ? aggregated : `sum by (${labels.join(", ")}) (${renamed})`;
};

const sum = (expr: string) => `sum(${expr})`;

const nonEvictable = ['memory_type="non-evictable"'];

export const getGkeQuery: GetPrometheusQuery = (opts, queryName) => {
  switch (opts.category) {
    case "cluster": {
      const containers = (path: string, matchers: string[] = []) => {
        const containerSeries = series(opts, path, "k8s_container", matchers);

        return opts.nodes
          ? withNodeOfPod(opts, containerSeries, `${metadataNodeNameLabel}=~"${opts.nodes}"`)
          : containerSeries;
      };
      const nodes = (path: string, matchers: string[] = []) =>
        series(opts, path, "k8s_node", [...matchers, ...nodeMatchers(opts, "k8s_node")]);

      switch (queryName) {
        case "memoryUsage":
          return sum(nodes("node_memory_used_bytes", nonEvictable));
        case "workloadMemoryUsage":
          return sum(containers("container_memory_used_bytes", nonEvictable));
        case "memoryRequests":
          return sum(containers("container_memory_request_bytes"));
        case "memoryLimits":
          return sum(containers("container_memory_limit_bytes"));
        case "memoryCapacity":
          return sum(nodes("node_memory_total_bytes"));
        case "memoryAllocatableCapacity":
          return sum(nodes("node_memory_allocatable_bytes"));
        case "cpuUsage":
          return sum(rate(nodes("node_cpu_core_usage_time")));
        case "cpuRequests":
          return sum(containers("container_cpu_request_cores"));
        case "cpuLimits":
          return sum(containers("container_cpu_limit_cores"));
        case "cpuCapacity":
          return sum(nodes("node_cpu_total_cores"));
        case "cpuAllocatableCapacity":
          return sum(nodes("node_cpu_allocatable_cores"));
        case "podUsage":
          // Every pod has a container that carries the node, so the pods are counted without the join.
          return `count(count by (namespace_name, pod_name) (${series(opts, "container_uptime", "k8s_container", nodeMatchers(opts, "k8s_container"))}))`;
        case "podCapacity":
        case "podAllocatableCapacity":
          return undefined;
        case "fsSize":
          return sum(nodes("node_ephemeral_storage_total_bytes"));
        case "fsUsage":
          return sum(nodes("node_ephemeral_storage_used_bytes"));
      }
      break;
    }
    case "nodes": {
      const nodes = (path: string, matchers: string[] = []) => series(opts, path, "k8s_node", matchers);
      const byNode = (expr: string) => sumBy(expr, ["node"]);
      const containers = (path: string, matchers: string[] = []) => series(opts, path, "k8s_container", matchers);
      const byNodeOfContainer = (expr: string) => sumBy(expr, ["node"], { node: metadataNodeNameLabel });

      switch (queryName) {
        case "memoryUsage":
          return byNode(nodes("node_memory_used_bytes", nonEvictable));
        case "workloadMemoryUsage":
          return byNodeOfContainer(
            withNodeOfPod(
              opts,
              containers("container_memory_used_bytes", nonEvictable),
              `${metadataNodeNameLabel}!=""`,
            ),
          );
        case "memoryCapacity":
          return byNode(nodes("node_memory_total_bytes"));
        case "memoryAllocatableCapacity":
          return byNode(nodes("node_memory_allocatable_bytes"));
        case "cpuUsage":
          return byNode(rate(nodes("node_cpu_core_usage_time")));
        case "cpuCapacity":
          return byNode(nodes("node_cpu_total_cores"));
        case "cpuAllocatableCapacity":
          return byNode(nodes("node_cpu_allocatable_cores"));
        case "fsSize":
          return byNode(nodes("node_ephemeral_storage_total_bytes"));
        case "fsUsage":
          return byNode(nodes("node_ephemeral_storage_used_bytes"));
      }
      break;
    }
    case "pods": {
      const containers = (path: string, matchers: string[] = []) =>
        series(opts, path, "k8s_container", [...matchers, ...podMatchers(opts, "k8s_container")]);
      const pods = (path: string) => series(opts, path, "k8s_pod", podMatchers(opts, "k8s_pod"));
      const bySelector = (expr: string) => sumBy(expr, parseSelector(opts.selector));

      switch (queryName) {
        case "cpuUsage":
          return bySelector(rate(containers("container_cpu_core_usage_time")));
        case "cpuRequests":
          return bySelector(containers("container_cpu_request_cores"));
        case "cpuLimits":
          return bySelector(containers("container_cpu_limit_cores"));
        case "memoryUsage":
          return bySelector(containers("container_memory_used_bytes", nonEvictable));
        case "memoryRequests":
          return bySelector(containers("container_memory_request_bytes"));
        case "memoryLimits":
          return bySelector(containers("container_memory_limit_bytes"));
        case "fsUsage":
          return bySelector(containers("container_ephemeral_storage_used_bytes"));
        case "fsWrites":
        case "fsReads":
          return undefined;
        case "networkReceive":
          return bySelector(rate(pods("pod_network_received_bytes_count")));
        case "networkTransmit":
          return bySelector(rate(pods("pod_network_sent_bytes_count")));
      }
      break;
    }
    case "pvc": {
      // The series of a volume that a claim backs carry the claim in labels of their own. A claim mounted by several
      // pods has a series for each of them, all for the same disk, so the query takes their maximum, not the sum.
      const claim = (path: string) =>
        `max(${series(opts, path, "k8s_pod", [
          `persistentvolumeclaim_name=${quote(opts.pvc ?? "")}`,
          `persistentvolumeclaim_namespace=${quote(opts.namespace ?? "")}`,
        ])})`;

      switch (queryName) {
        case "diskUsage":
          return claim("pod_volume_used_bytes");
        case "diskCapacity":
          return claim("pod_volume_total_bytes");
      }
      break;
    }
    case "ingress":
      switch (queryName) {
        case "bytesSentSuccess":
        case "bytesSentFailure":
        case "requestDurationSeconds":
        case "responseDurationSeconds":
          return undefined;
      }
      break;
  }

  throw new Error(`Unknown queryName="${queryName}" for category="${opts.category}"`);
};

/**
 * The image with a tag or a digest, or without either. A longer name that only starts the same is another image.
 */
const isGmpFrontendImage = (image = "") =>
  image === gmpFrontendImage || image.startsWith(`${gmpFrontendImage}:`) || image.startsWith(`${gmpFrontendImage}@`);

/**
 * Whether the pods that the Service selects run the GMP frontend.
 */
async function runsGmpFrontend(client: CoreV1Api, service: V1Service): Promise<boolean> {
  const namespace = service.metadata?.namespace;
  const selector = Object.entries(service.spec?.selector ?? {});

  if (!namespace || selector.length === 0) {
    return false;
  }

  const labelSelector = selector.map(([key, value]) => `${key}=${value}`).join(",");
  const { items } = await client.listNamespacedPod({ namespace, labelSelector });

  return items.some((pod) => pod.spec?.containers.some(({ image }) => isGmpFrontendImage(image)));
}

/**
 * The candidates for the GMP frontend, in the order they are tried: by name in the namespaces of a fixed list, then
 * by the label `app` in every namespace. A failed lookup only skips its candidates.
 */
async function* listCandidates(client: CoreV1Api): AsyncGenerator<V1Service> {
  for (const name of gmpFrontendServiceNames) {
    for (const namespace of gmpFrontendNamespaces) {
      try {
        yield await client.readNamespacedService({ name, namespace });
      } catch {
        // A namespace or a service that does not exist, or one the user may not read.
      }
    }
  }

  for (const app of gmpFrontendAppLabels) {
    try {
      const { items } = await client.listServiceForAllNamespaces({ labelSelector: `app=${app}` });

      yield* items;
    } catch {
      // Listing the services of every namespace may be forbidden.
    }
  }
}

export async function findGmpFrontendService(client: CoreV1Api): Promise<PrometheusServiceInfo> {
  const checked = new Set<string>();

  for await (const service of listCandidates(client)) {
    const namespace = service.metadata?.namespace;
    const name = service.metadata?.name;
    const ports = service.spec?.ports ?? [];
    const port = ports.find((port) => port.name === "web") ?? ports[0];

    if (!namespace || !name || !port) {
      continue;
    }

    const key = `${namespace}/${name}`;

    if (checked.has(key)) {
      continue;
    }

    checked.add(key);

    try {
      if (!(await runsGmpFrontend(client, service))) {
        continue;
      }
    } catch {
      continue;
    }

    const clusterName = service.metadata?.annotations?.[gkeClusterNameAnnotation]?.trim();

    return {
      namespace,
      service: name,
      port: port.port,
      ...(clusterName ? { queryOpts: { [gkeClusterNameQueryOpt]: clusterName } } : {}),
    };
  }

  throw new Error(`No service found whose pods run ${gmpFrontendImage}`);
}

const gkePrometheusProviderInjectable = getInjectable({
  id: "gke-prometheus-provider",
  instantiate: () =>
    createPrometheusProvider({
      kind: gkePrometheusProviderKind,
      name: "Google Managed Prometheus",
      isConfigurable: true,
      // A Prometheus run in the cluster has the full metric set; the GKE system metrics are what is left without one.
      isFallback: true,
      getQuery: getGkeQuery,
      getService: findGmpFrontendService,
    }),
  injectionToken: prometheusProviderInjectionToken,
});

export default gkePrometheusProviderInjectable;
