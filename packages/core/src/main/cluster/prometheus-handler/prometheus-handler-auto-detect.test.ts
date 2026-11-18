/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { gmpFrontendImage, prometheusProviderInjectionToken } from "@freelensapp/prometheus";
import { registerInjectables } from "@freelensapp/prometheus/src/register-injectables";
import { createContainer } from "@ogre-tools/injectable";
import { computed } from "mobx";
import { beforeEach, describe, expect, it } from "vitest";
import { createClusterPrometheusHandler, sortForAutoDetection } from "./prometheus-handler";

import type { Logger } from "@freelensapp/logger";
import type { PrometheusProvider } from "@freelensapp/prometheus";

import type { CoreV1Api, V1Pod, V1Service } from "@kubernetes/client-node";

import type { Cluster } from "../../../common/cluster/cluster";
import type { LoadProxyKubeconfig } from "../load-proxy-kubeconfig.injectable";

const stubProvider = (kind: string, isFallback?: boolean): PrometheusProvider => ({
  kind,
  name: kind,
  isConfigurable: true,
  isFallback,
  getQuery: () => "up",
  getPrometheusService: async () => ({ kind, namespace: "monitoring", service: kind, port: 9090 }),
});

describe("the order of the providers for Auto Detect", () => {
  it("moves the fallback providers to the end and keeps the order of the others", () => {
    const providers = [
      stubProvider("first-fallback", true),
      stubProvider("lens"),
      stubProvider("second-fallback", true),
      stubProvider("helm"),
      stubProvider("operator", false),
    ];

    expect(sortForAutoDetection(providers).map(({ kind }) => kind)).toEqual([
      "lens",
      "helm",
      "operator",
      "first-fallback",
      "second-fallback",
    ]);
  });

  describe("with the providers of the prometheus feature", () => {
    let providers: PrometheusProvider[];

    const operatorService: V1Service = {
      metadata: { namespace: "monitoring", name: "prometheus-operated", labels: { "operated-prometheus": "true" } },
      spec: { ports: [{ port: 9090 }] },
    };
    const frontendService: V1Service = {
      metadata: { namespace: "gmp-public", name: "frontend" },
      spec: { selector: { app: "frontend" }, ports: [{ name: "web", port: 9090 }] },
    };
    const frontendPod: V1Pod = {
      metadata: { namespace: "gmp-public", name: "frontend-abc", labels: { app: "frontend" } },
      spec: { containers: [{ name: "frontend", image: `${gmpFrontendImage}:v0.15.3-gke.0` }] },
    };

    const fakeClient = (services: V1Service[], pods: V1Pod[]) => {
      const matches = (labels: Record<string, string> | undefined, labelSelector: string) =>
        labelSelector.split(",").every((term) => {
          const [key, value] = term.split("=");

          return value === undefined ? labels?.[key] !== undefined : labels?.[key] === value;
        });

      return {
        readNamespacedService: async ({ name, namespace }: { name: string; namespace: string }) => {
          const found = services.find(({ metadata }) => metadata?.name === name && metadata.namespace === namespace);

          if (!found) {
            throw new Error("not found");
          }

          return found;
        },
        listServiceForAllNamespaces: async ({ labelSelector }: { labelSelector: string }) => ({
          items: services.filter(({ metadata }) => matches(metadata?.labels, labelSelector)),
        }),
        listNamespacedPod: async ({ namespace, labelSelector }: { namespace: string; labelSelector: string }) => ({
          items: pods.filter(
            ({ metadata }) => metadata?.namespace === namespace && matches(metadata.labels, labelSelector),
          ),
        }),
      } as unknown as CoreV1Api;
    };

    const detect = (client: CoreV1Api) => {
      const cluster = { id: "some-cluster-id", preferences: {} } as unknown as Cluster;
      const loadProxyKubeconfig = (async () => ({ makeApiClient: () => client })) as unknown as LoadProxyKubeconfig;
      const handler = createClusterPrometheusHandler(
        {
          prometheusProviders: computed(() => providers),
          logger: { info: () => {} } as unknown as Logger,
          getPrometheusProviderByKind: (kind) => providers.find((provider) => provider.kind === kind)!,
          loadProxyKubeconfig,
        },
        cluster,
      );

      return handler.getPrometheusDetails();
    };

    beforeEach(() => {
      const di = createContainer("prometheus-auto-detect-test");

      registerInjectables(di);

      // In the order of their registration, as Auto Detect gets them.
      providers = di.injectMany(prometheusProviderInjectionToken);
    });

    it("registers the GKE provider before another provider, so the registration order alone would pick it", () => {
      expect(providers[0].kind).toBe("gke");
      expect(providers[0].isFallback).toBe(true);
    });

    it("picks another provider that found a service over the GKE provider", async () => {
      const details = await detect(fakeClient([frontendService, operatorService], [frontendPod]));

      expect(details.provider.kind).toBe("operator");
      expect(details.prometheusPath).toBe("monitoring/services/prometheus-operated:9090");
    });

    it("picks the GKE provider when no other provider found a service", async () => {
      const details = await detect(fakeClient([frontendService], [frontendPod]));

      expect(details.provider.kind).toBe("gke");
      expect(details.prometheusPath).toBe("gmp-public/services/frontend:9090");
    });
  });
});
