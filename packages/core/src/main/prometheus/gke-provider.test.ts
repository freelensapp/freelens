/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { gkeClusterNameAnnotation, gmpFrontendImage } from "@freelensapp/prometheus";
import gkePrometheusProviderInjectable, {
  findGmpFrontendService,
  getGkeQuery,
  gkeClusterNameQueryOpt,
  sumBy,
} from "@freelensapp/prometheus/src/gke-provider.injectable";
import { createContainer } from "@ogre-tools/injectable";
import { describe, expect, it } from "vitest";

import type { CoreV1Api, V1Pod, V1Service } from "@kubernetes/client-node";

const clusterOpts = { category: "cluster", mountpoints: "/" };
const nodesOpts = { category: "nodes", mountpoints: "/" };
const podsOpts = {
  category: "pods",
  pods: "web-.*",
  namespace: "shop",
  selector: "pod, namespace",
  mountpoints: "/",
};

describe("the GKE prometheus provider", () => {
  describe("queries", () => {
    it.each([
      [
        "memoryUsage",
        'sum(kubernetes_io:node_memory_used_bytes{monitored_resource="k8s_node",memory_type="non-evictable"})',
      ],
      [
        "workloadMemoryUsage",
        'sum(kubernetes_io:container_memory_used_bytes{monitored_resource="k8s_container",memory_type="non-evictable"})',
      ],
      ["memoryRequests", 'sum(kubernetes_io:container_memory_request_bytes{monitored_resource="k8s_container"})'],
      ["memoryLimits", 'sum(kubernetes_io:container_memory_limit_bytes{monitored_resource="k8s_container"})'],
      ["memoryCapacity", 'sum(kubernetes_io:node_memory_total_bytes{monitored_resource="k8s_node"})'],
      ["memoryAllocatableCapacity", 'sum(kubernetes_io:node_memory_allocatable_bytes{monitored_resource="k8s_node"})'],
      ["cpuUsage", 'sum(rate(kubernetes_io:node_cpu_core_usage_time{monitored_resource="k8s_node"}[5m]))'],
      ["cpuRequests", 'sum(kubernetes_io:container_cpu_request_cores{monitored_resource="k8s_container"})'],
      ["cpuLimits", 'sum(kubernetes_io:container_cpu_limit_cores{monitored_resource="k8s_container"})'],
      ["cpuCapacity", 'sum(kubernetes_io:node_cpu_total_cores{monitored_resource="k8s_node"})'],
      ["cpuAllocatableCapacity", 'sum(kubernetes_io:node_cpu_allocatable_cores{monitored_resource="k8s_node"})'],
      [
        "podUsage",
        'count(count by (namespace_name, pod_name) (kubernetes_io:container_uptime{monitored_resource="k8s_container"}))',
      ],
      ["fsSize", 'sum(kubernetes_io:node_ephemeral_storage_total_bytes{monitored_resource="k8s_node"})'],
      ["fsUsage", 'sum(kubernetes_io:node_ephemeral_storage_used_bytes{monitored_resource="k8s_node"})'],
    ])("builds the cluster query %s", (queryName, expected) => {
      expect(getGkeQuery(clusterOpts, queryName)).toBe(expected);
    });

    it("filters the node series of the cluster on node_name", () => {
      expect(getGkeQuery({ ...clusterOpts, nodes: "n1|n2" }, "cpuCapacity")).toBe(
        'sum(kubernetes_io:node_cpu_total_cores{monitored_resource="k8s_node",node_name=~"n1|n2"})',
      );
    });

    const nodeOfPod = (matcher: string) =>
      ` * on (namespace_name, pod_name) group_left (metadata_system_node_name) (0 * bottomk by (namespace_name, pod_name) (1, kubernetes_io:container_uptime{monitored_resource="k8s_container",${matcher}}) + 1)`;

    it("filters the container series of the cluster on the node of their pod, so the sidecars count too", () => {
      expect(getGkeQuery({ ...clusterOpts, nodes: "n1|n2" }, "cpuRequests")).toBe(
        `sum(sum by (namespace_name, pod_name) (kubernetes_io:container_cpu_request_cores{monitored_resource="k8s_container"})${nodeOfPod('metadata_system_node_name=~"n1|n2"')})`,
      );
    });

    it("filters both sides of the join on the cluster", () => {
      const query = getGkeQuery({ ...clusterOpts, nodes: "n1", [gkeClusterNameQueryOpt]: "prod" }, "memoryRequests");

      expect(query).toContain('container_memory_request_bytes{monitored_resource="k8s_container",cluster_name="prod"}');
      expect(query).toContain('metadata_system_node_name=~"n1",cluster_name="prod"}');
    });

    it("counts the pods of the nodes without the join", () => {
      expect(getGkeQuery({ ...clusterOpts, nodes: "n1" }, "podUsage")).toBe(
        'count(count by (namespace_name, pod_name) (kubernetes_io:container_uptime{monitored_resource="k8s_container",metadata_system_node_name=~"n1"}))',
      );
    });

    const byNode = (series: string) =>
      `sum by (node) (label_replace(sum by (node_name) (${series}), "node", "$1", "node_name", "(.*)"))`;

    it.each([
      [
        "memoryUsage",
        byNode('kubernetes_io:node_memory_used_bytes{monitored_resource="k8s_node",memory_type="non-evictable"}'),
      ],
      [
        "workloadMemoryUsage",
        `sum by (node) (label_replace(sum by (metadata_system_node_name) (sum by (namespace_name, pod_name) (kubernetes_io:container_memory_used_bytes{monitored_resource="k8s_container",memory_type="non-evictable"}) * on (namespace_name, pod_name) group_left (metadata_system_node_name) (0 * bottomk by (namespace_name, pod_name) (1, kubernetes_io:container_uptime{monitored_resource="k8s_container",metadata_system_node_name!=""}) + 1)), "node", "$1", "metadata_system_node_name", "(.*)"))`,
      ],
      ["memoryCapacity", byNode('kubernetes_io:node_memory_total_bytes{monitored_resource="k8s_node"}')],
      [
        "memoryAllocatableCapacity",
        byNode('kubernetes_io:node_memory_allocatable_bytes{monitored_resource="k8s_node"}'),
      ],
      ["cpuUsage", byNode('rate(kubernetes_io:node_cpu_core_usage_time{monitored_resource="k8s_node"}[5m])')],
      ["cpuCapacity", byNode('kubernetes_io:node_cpu_total_cores{monitored_resource="k8s_node"}')],
      ["cpuAllocatableCapacity", byNode('kubernetes_io:node_cpu_allocatable_cores{monitored_resource="k8s_node"}')],
      ["fsSize", byNode('kubernetes_io:node_ephemeral_storage_total_bytes{monitored_resource="k8s_node"}')],
      ["fsUsage", byNode('kubernetes_io:node_ephemeral_storage_used_bytes{monitored_resource="k8s_node"}')],
    ])("builds the nodes query %s grouped by node", (queryName, expected) => {
      expect(getGkeQuery(nodesOpts, queryName)).toBe(expected);
    });

    const byPod = (series: string) =>
      `sum by (pod, namespace) (label_replace(label_replace(sum by (pod_name, namespace_name) (${series}), "pod", "$1", "pod_name", "(.*)"), "namespace", "$1", "namespace_name", "(.*)"))`;
    const containerFilter = 'pod_name=~"web-.*",namespace_name="shop"';

    it.each([
      [
        "cpuUsage",
        byPod(
          `rate(kubernetes_io:container_cpu_core_usage_time{monitored_resource="k8s_container",${containerFilter}}[5m])`,
        ),
      ],
      [
        "cpuRequests",
        byPod(`kubernetes_io:container_cpu_request_cores{monitored_resource="k8s_container",${containerFilter}}`),
      ],
      [
        "cpuLimits",
        byPod(`kubernetes_io:container_cpu_limit_cores{monitored_resource="k8s_container",${containerFilter}}`),
      ],
      [
        "memoryUsage",
        byPod(
          `kubernetes_io:container_memory_used_bytes{monitored_resource="k8s_container",memory_type="non-evictable",${containerFilter}}`,
        ),
      ],
      [
        "memoryRequests",
        byPod(`kubernetes_io:container_memory_request_bytes{monitored_resource="k8s_container",${containerFilter}}`),
      ],
      [
        "memoryLimits",
        byPod(`kubernetes_io:container_memory_limit_bytes{monitored_resource="k8s_container",${containerFilter}}`),
      ],
      [
        "fsUsage",
        byPod(
          `kubernetes_io:container_ephemeral_storage_used_bytes{monitored_resource="k8s_container",${containerFilter}}`,
        ),
      ],
      [
        "networkReceive",
        byPod(
          `rate(kubernetes_io:pod_network_received_bytes_count{monitored_resource="k8s_pod",${containerFilter}}[5m])`,
        ),
      ],
      [
        "networkTransmit",
        byPod(`rate(kubernetes_io:pod_network_sent_bytes_count{monitored_resource="k8s_pod",${containerFilter}}[5m])`),
      ],
    ])("builds the pods query %s grouped by the selector", (queryName, expected) => {
      expect(getGkeQuery(podsOpts, queryName)).toBe(expected);
    });

    it("filters the container series of a pod on the container, but not the pod series", () => {
      const opts = { ...podsOpts, container: "nginx", selector: "pod, container, namespace" };

      expect(getGkeQuery(opts, "memoryLimits")).toContain(
        `{monitored_resource="k8s_container",${containerFilter},container_name="nginx"}`,
      );
      expect(getGkeQuery(opts, "networkReceive")).toContain(`{monitored_resource="k8s_pod",${containerFilter}}`);
    });

    it("renames the labels of the selector to the ones the views read", () => {
      const query = getGkeQuery({ ...podsOpts, selector: "pod, container, namespace" }, "cpuLimits");

      expect(query).toMatch(/^sum by \(pod, container, namespace\) /);
      expect(query).toContain("sum by (pod_name, container_name, namespace_name) (");
      expect(query).toContain('"container", "$1", "container_name", "(.*)"');
    });

    it("sums without grouping when the selector is empty", () => {
      expect(getGkeQuery({ ...podsOpts, selector: "" }, "cpuLimits")).toBe(
        `sum by () (kubernetes_io:container_cpu_limit_cores{monitored_resource="k8s_container",${containerFilter}})`,
      );
    });

    it("keeps a label that has the same name in GKE", () => {
      expect(sumBy("x", ["location"])).toBe("sum by (location) (x)");
    });

    it.each([
      ["diskUsage", "pod_volume_used_bytes"],
      ["diskCapacity", "pod_volume_total_bytes"],
    ])("builds the pvc query %s from the series that carry the claim", (queryName, path) => {
      expect(getGkeQuery({ category: "pvc", pvc: "data-db-0", namespace: "shop" }, queryName)).toBe(
        `max(kubernetes_io:${path}{monitored_resource="k8s_pod",persistentvolumeclaim_name="data-db-0",persistentvolumeclaim_namespace="shop"})`,
      );
    });

    it.each([
      ["cluster", "podCapacity"],
      ["cluster", "podAllocatableCapacity"],
      ["pods", "fsReads"],
      ["pods", "fsWrites"],
      ["ingress", "bytesSentSuccess"],
      ["ingress", "bytesSentFailure"],
      ["ingress", "requestDurationSeconds"],
      ["ingress", "responseDurationSeconds"],
    ])("has no query for %s %s", (category, queryName) => {
      expect(getGkeQuery({ ...podsOpts, category }, queryName)).toBeUndefined();
    });

    it("throws for a query it does not know", () => {
      expect(() => getGkeQuery(clusterOpts, "somethingElse")).toThrow(
        'Unknown queryName="somethingElse" for category="cluster"',
      );
    });

    describe("given the name of the GKE cluster", () => {
      it.each([
        ["cluster", "cpuUsage"],
        ["cluster", "cpuRequests"],
        ["cluster", "podUsage"],
        ["nodes", "memoryCapacity"],
        ["pods", "memoryUsage"],
        ["pods", "networkTransmit"],
        ["pvc", "diskUsage"],
      ])("filters %s %s on the cluster", (category, queryName) => {
        const query = getGkeQuery({ ...podsOpts, category, [gkeClusterNameQueryOpt]: "prod" }, queryName);

        expect(query).toContain(',cluster_name="prod"}');
      });

      it("escapes the name", () => {
        expect(getGkeQuery({ ...clusterOpts, [gkeClusterNameQueryOpt]: 'a"b\\c' }, "cpuCapacity")).toContain(
          'cluster_name="a\\"b\\\\c"',
        );
      });
    });

    it("does not filter on the cluster without its name", () => {
      expect(getGkeQuery(clusterOpts, "cpuUsage")).not.toContain("cluster_name");
    });
  });

  describe("the provider", () => {
    it("is configurable and a fallback for Auto Detect", () => {
      const di = createContainer("gke-provider-test");

      di.register(gkePrometheusProviderInjectable);

      const provider = di.inject(gkePrometheusProviderInjectable);

      expect(provider).toMatchObject({
        kind: "gke",
        name: "Google Managed Prometheus",
        isConfigurable: true,
        isFallback: true,
      });
    });
  });

  describe("auto-detection", () => {
    const notFound = () => Object.assign(new Error("HTTP-Code: 404"), { code: 404 });

    interface FakeCluster {
      services: V1Service[];
      pods: V1Pod[];
      forbidden?: { listServices?: boolean; listPods?: boolean };
    }

    const service = (
      namespace: string,
      name: string,
      opts: {
        labels?: Record<string, string>;
        selector?: Record<string, string>;
        ports?: { name?: string; port: number }[];
        annotations?: Record<string, string>;
      } = {},
    ): V1Service => ({
      metadata: { namespace, name, labels: opts.labels, annotations: opts.annotations },
      spec: {
        selector: "selector" in opts ? opts.selector : { app: name },
        ports: opts.ports ?? [{ port: 9090 }],
      },
    });

    const pod = (namespace: string, labels: Record<string, string>, image: string): V1Pod => ({
      metadata: { namespace, name: `${labels.app}-abc`, labels },
      spec: { containers: [{ name: "main", image }] },
    });

    const matches = (labels: Record<string, string> | undefined, labelSelector: string) =>
      labelSelector.split(",").every((term) => {
        const [key, value] = term.split("=");

        return labels?.[key] === value;
      });

    const fakeClient = (cluster: FakeCluster) => {
      const calls: string[] = [];
      const client = {
        readNamespacedService: async ({ name, namespace }: { name: string; namespace: string }) => {
          calls.push(`read ${namespace}/${name}`);

          const found = cluster.services.find(
            ({ metadata }) => metadata?.name === name && metadata.namespace === namespace,
          );

          if (!found) {
            throw notFound();
          }

          return found;
        },
        listServiceForAllNamespaces: async ({ labelSelector }: { labelSelector: string }) => {
          calls.push(`list ${labelSelector}`);

          if (cluster.forbidden?.listServices) {
            throw new Error("forbidden");
          }

          return { items: cluster.services.filter(({ metadata }) => matches(metadata?.labels, labelSelector)) };
        },
        listNamespacedPod: async ({ namespace, labelSelector }: { namespace: string; labelSelector: string }) => {
          calls.push(`pods ${namespace} ${labelSelector}`);

          if (cluster.forbidden?.listPods) {
            throw new Error("forbidden");
          }

          return {
            items: cluster.pods.filter(
              ({ metadata }) => metadata?.namespace === namespace && matches(metadata.labels, labelSelector),
            ),
          };
        },
      };

      return { client: client as unknown as CoreV1Api, calls };
    };

    const frontendImage = `${gmpFrontendImage}:v0.15.3-gke.0`;

    it("finds the frontend by name in a namespace of the list, confirmed by the image of its pods", async () => {
      const { client } = fakeClient({
        services: [service("gmp-public", "frontend")],
        pods: [pod("gmp-public", { app: "frontend" }, frontendImage)],
      });

      await expect(findGmpFrontendService(client)).resolves.toEqual({
        namespace: "gmp-public",
        service: "frontend",
        port: 9090,
      });
    });

    it("rejects a service named frontend whose pods run another image", async () => {
      const { client } = fakeClient({
        services: [service("default", "frontend")],
        pods: [pod("default", { app: "frontend" }, "example.com/shop/frontend:1.0")],
      });

      await expect(findGmpFrontendService(client)).rejects.toThrow();
    });

    it("rejects an image whose name only starts with the one of the frontend", async () => {
      const { client } = fakeClient({
        services: [service("default", "frontend")],
        pods: [pod("default", { app: "frontend" }, `${gmpFrontendImage}-fork:1.0`)],
      });

      await expect(findGmpFrontendService(client)).rejects.toThrow();
    });

    it("accepts the image by digest", async () => {
      const { client } = fakeClient({
        services: [service("monitoring", "frontend")],
        pods: [pod("monitoring", { app: "frontend" }, `${gmpFrontendImage}@sha256:0123`)],
      });

      await expect(findGmpFrontendService(client)).resolves.toMatchObject({ namespace: "monitoring" });
    });

    it("does not confirm a service without a selector", async () => {
      const { client, calls } = fakeClient({
        services: [service("gmp-public", "frontend", { selector: undefined })],
        pods: [pod("gmp-public", { app: "frontend" }, frontendImage)],
      });

      await expect(findGmpFrontendService(client)).rejects.toThrow();
      expect(calls.filter((call) => call.startsWith("pods"))).toEqual([]);
    });

    it("prefers the name gmp-frontend in any namespace of the list to the name frontend", async () => {
      const { client } = fakeClient({
        services: [service("gmp-public", "frontend"), service("default", "gmp-frontend")],
        pods: [
          pod("gmp-public", { app: "frontend" }, frontendImage),
          pod("default", { app: "gmp-frontend" }, frontendImage),
        ],
      });

      await expect(findGmpFrontendService(client)).resolves.toMatchObject({
        namespace: "default",
        service: "gmp-frontend",
      });
    });

    it("tries the namespaces in the order of the list", async () => {
      const { client, calls } = fakeClient({ services: [], pods: [] });

      await expect(findGmpFrontendService(client)).rejects.toThrow();
      expect(calls).toEqual([
        "read gmp-public/gmp-frontend",
        "read gmp-system/gmp-frontend",
        "read monitoring/gmp-frontend",
        "read default/gmp-frontend",
        "read gmp-public/frontend",
        "read gmp-system/frontend",
        "read monitoring/frontend",
        "read default/frontend",
        "list app=gmp-frontend",
        "list app=frontend",
      ]);
    });

    it("finds the frontend by its label app in any namespace", async () => {
      const { client } = fakeClient({
        services: [service("observability", "query", { labels: { app: "frontend" }, selector: { app: "query" } })],
        pods: [pod("observability", { app: "query" }, frontendImage)],
      });

      await expect(findGmpFrontendService(client)).resolves.toEqual({
        namespace: "observability",
        service: "query",
        port: 9090,
      });
    });

    it("prefers the label app=gmp-frontend to app=frontend", async () => {
      const { client } = fakeClient({
        services: [
          service("a", "one", { labels: { app: "frontend" } }),
          service("b", "two", { labels: { app: "gmp-frontend" } }),
        ],
        pods: [pod("a", { app: "one" }, frontendImage), pod("b", { app: "two" }, frontendImage)],
      });

      await expect(findGmpFrontendService(client)).resolves.toMatchObject({ namespace: "b", service: "two" });
    });

    it("takes the port named web over the first port", async () => {
      const { client } = fakeClient({
        services: [
          service("gmp-public", "frontend", {
            ports: [
              { name: "metrics", port: 8080 },
              { name: "web", port: 9090 },
            ],
          }),
        ],
        pods: [pod("gmp-public", { app: "frontend" }, frontendImage)],
      });

      await expect(findGmpFrontendService(client)).resolves.toMatchObject({ port: 9090 });
    });

    it("takes the first port when none is named web", async () => {
      const { client } = fakeClient({
        services: [
          service("gmp-public", "frontend", {
            ports: [
              { name: "http", port: 8080 },
              { name: "other", port: 9090 },
            ],
          }),
        ],
        pods: [pod("gmp-public", { app: "frontend" }, frontendImage)],
      });

      await expect(findGmpFrontendService(client)).resolves.toMatchObject({ port: 8080 });
    });

    it("skips a candidate whose pods cannot be listed and a label lookup that is forbidden", async () => {
      const { client } = fakeClient({
        services: [service("gmp-public", "frontend")],
        pods: [pod("gmp-public", { app: "frontend" }, frontendImage)],
        forbidden: { listPods: true, listServices: true },
      });

      await expect(findGmpFrontendService(client)).rejects.toThrow(
        `No service found whose pods run ${gmpFrontendImage}`,
      );
    });

    it("passes the name of the GKE cluster from the annotation of the service to the queries", async () => {
      const { client } = fakeClient({
        services: [service("gmp-public", "frontend", { annotations: { [gkeClusterNameAnnotation]: " prod " } })],
        pods: [pod("gmp-public", { app: "frontend" }, frontendImage)],
      });

      await expect(findGmpFrontendService(client)).resolves.toEqual({
        namespace: "gmp-public",
        service: "frontend",
        port: 9090,
        queryOpts: { [gkeClusterNameQueryOpt]: "prod" },
      });
    });

    it("wraps a failed detection in the error of the provider", async () => {
      const di = createContainer("gke-provider-test");

      di.register(gkePrometheusProviderInjectable);

      const { client } = fakeClient({ services: [], pods: [] });

      await expect(di.inject(gkePrometheusProviderInjectable).getPrometheusService(client)).rejects.toThrow(
        'Failed to find Prometheus provider for "Google Managed Prometheus"',
      );
    });
  });
});
