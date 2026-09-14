/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import helmPrometheusProviderInjectable from "@freelensapp/prometheus/src/helm-provider.injectable";
import lensPrometheusProviderInjectable from "@freelensapp/prometheus/src/lens-provider.injectable";
import operatorPrometheusProviderInjectable from "@freelensapp/prometheus/src/operator-provider.injectable";
import stacklightPrometheusProviderInjectable from "@freelensapp/prometheus/src/stacklight-provider.injectable";
import { createContainer } from "@ogre-tools/injectable";

import type { PrometheusProvider } from "@freelensapp/prometheus";

const clusterMetricNames = [
  "memoryUsage",
  "workloadMemoryUsage",
  "memoryRequests",
  "memoryLimits",
  "memoryCapacity",
  "memoryAllocatableCapacity",
  "cpuUsage",
  "cpuRequests",
  "cpuLimits",
  "cpuCapacity",
  "cpuAllocatableCapacity",
  "podUsage",
  "podCapacity",
  "podAllocatableCapacity",
  "fsSize",
  "fsUsage",
];

const nodeExporterMetricNames = ["memoryUsage", "cpuUsage", "fsSize", "fsUsage"];

const nodeLabelsByProviderKind: Record<string, string[]> = {
  lens: ["kubernetes_node", "node", "instance"],
  helm: ["node", "instance"],
  operator: ["node", "instance"],
  stacklight: ["node", "instance"],
};

describe("cluster metrics node filter in the prometheus providers", () => {
  let providers: PrometheusProvider[];

  beforeEach(() => {
    const di = createContainer("prometheus-providers-test");

    di.register(
      lensPrometheusProviderInjectable,
      helmPrometheusProviderInjectable,
      operatorPrometheusProviderInjectable,
      stacklightPrometheusProviderInjectable,
    );

    providers = [
      lensPrometheusProviderInjectable,
      helmPrometheusProviderInjectable,
      operatorPrometheusProviderInjectable,
      stacklightPrometheusProviderInjectable,
    ].map((injectable) => di.inject(injectable));
  });

  it("covers the four providers", () => {
    expect(providers.map((provider) => provider.kind)).toEqual(["lens", "helm", "operator", "stacklight"]);
  });

  describe("given a list of node names", () => {
    const opts = { category: "cluster", nodes: "worker-1|worker-2", mountpoints: "/" };

    it.each(clusterMetricNames)("filters %s by the node names", (metricName) => {
      for (const provider of providers) {
        const query = provider.getQuery(opts, metricName);

        expect(query, `${provider.kind}: ${query}`).toContain(`=~"worker-1|worker-2"`);
        expect(query, `${provider.kind}: ${query}`).not.toContain(`=~""`);
      }
    });

    it.each(clusterMetricNames)("filters %s by a node label of the provider", (metricName) => {
      for (const provider of providers) {
        const query = provider.getQuery(opts, metricName);
        const labels = nodeLabelsByProviderKind[provider.kind];

        expect(
          labels.some((label) => query.includes(`${label}=~"worker-1|worker-2"`)),
          `${provider.kind}: ${query}`,
        ).toBe(true);
      }
    });

    it.each(nodeExporterMetricNames)(
      "joins the node-exporter series of %s with kube_pod_info in the operator provider",
      (metricName) => {
        const operator = providers.find((provider) => provider.kind === "operator")!;
        const query = operator.getQuery(opts, metricName);

        expect(query).toContain(
          `* on (pod,namespace) group_left(node) max without(pod_ip,host_ip) (kube_pod_info{node=~"worker-1|worker-2"})`,
        );
      },
    );

    it("keeps the mountpoint filter on the filesystem metrics", () => {
      for (const provider of providers) {
        expect(provider.getQuery(opts, "fsSize")).toContain(`mountpoint=~"/"`);
        expect(provider.getQuery(opts, "fsUsage")).toContain(`mountpoint=~"/"`);
      }
    });
  });

  describe("given no node names", () => {
    const opts = { category: "cluster", mountpoints: "/" };

    it.each(clusterMetricNames)("does not filter %s by node at all", (metricName) => {
      for (const provider of providers) {
        const query = provider.getQuery(opts, metricName);

        expect(query, `${provider.kind}: ${query}`).not.toMatch(/(node|kubernetes_node|instance)=~/);
        expect(query, `${provider.kind}: ${query}`).not.toContain("undefined");
        expect(query, `${provider.kind}: ${query}`).not.toContain("kube_pod_info");
      }
    });

    it.each(clusterMetricNames)("produces a query with balanced braces for %s", (metricName) => {
      for (const provider of providers) {
        const query = provider.getQuery(opts, metricName);
        const opening = query.split("{").length - 1;
        const closing = query.split("}").length - 1;

        expect(opening, `${provider.kind}: ${query}`).toBe(closing);
        expect(query, `${provider.kind}: ${query}`).not.toContain("{,");
        expect(query, `${provider.kind}: ${query}`).not.toContain("{}");
      }
    });
  });
});
