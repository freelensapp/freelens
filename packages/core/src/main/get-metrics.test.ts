/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import proxyFetchInjectable from "./fetch/proxy-fetch.injectable";
import getMetricsInjectable from "./get-metrics.injectable";
import { getDiForUnitTesting } from "./getDiForUnitTesting";
import k8sRequestInjectable from "./k8s-request.injectable";

import type { Cluster } from "../common/cluster/cluster";
import type { ClusterPreferences } from "../common/cluster-types";
import type { ProxyFetch } from "./fetch/proxy-fetch.injectable";
import type { GetMetrics } from "./get-metrics.injectable";
import type { K8sRequest } from "./k8s-request.injectable";

const tenant = { "X-Scope-OrgID": "team-a" };
const service = { namespace: "mimir", service: "mimir-query-frontend", port: 8080, prefix: "/prometheus" };
const servicePath = "mimir/services/mimir-query-frontend:8080";
const formContentType = { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" };

const clusterWith = (preferences: ClusterPreferences) => ({ id: "some-cluster-id", preferences }) as unknown as Cluster;

describe("getMetrics", () => {
  let getMetrics: GetMetrics;
  let k8sRequest: ReturnType<typeof vi.fn<K8sRequest>>;
  let proxyFetch: ReturnType<typeof vi.fn<ProxyFetch>>;

  beforeEach(() => {
    const di = getDiForUnitTesting();

    k8sRequest = vi.fn<K8sRequest>(async () => ({ status: "success" }));
    proxyFetch = vi.fn<ProxyFetch>(async () => new Response(JSON.stringify({ status: "success" })));
    di.override(k8sRequestInjectable, () => k8sRequest);
    di.override(proxyFetchInjectable, () => proxyFetch);
    getMetrics = di.inject(getMetricsInjectable);
  });

  describe("through the service proxy of the Kubernetes API", () => {
    it("sends the custom headers with a POST request", async () => {
      await getMetrics(clusterWith({ prometheus: { ...service, customHeaders: tenant } }), servicePath, {
        query: "up",
      });

      expect(k8sRequest).toHaveBeenCalledWith(
        expect.objectContaining({ id: "some-cluster-id" }),
        "/api/v1/namespaces/mimir/services/mimir-query-frontend:8080/proxy/prometheus/api/v1/query_range",
        expect.objectContaining({ method: "POST", headers: { ...tenant, ...formContentType }, body: "query=up" }),
      );
    });

    it("sends the custom headers with a GET request", async () => {
      await getMetrics(
        clusterWith({ prometheusRequestMethod: "GET", prometheus: { ...service, customHeaders: tenant } }),
        servicePath,
        { query: "up" },
      );

      expect(k8sRequest).toHaveBeenCalledWith(
        expect.objectContaining({ id: "some-cluster-id" }),
        "/api/v1/namespaces/mimir/services/mimir-query-frontend:8080/proxy/prometheus/api/v1/query_range?query=up",
        expect.objectContaining({ method: "GET", headers: tenant }),
      );
    });

    it("sends no other header when none is configured", async () => {
      await getMetrics(clusterWith({ prometheus: service }), servicePath, { query: "up" });

      expect(k8sRequest).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(String),
        expect.objectContaining({ headers: formContentType }),
      );
    });
  });

  describe("to a direct URL", () => {
    it("sends the custom headers next to the bearer token", async () => {
      await getMetrics(
        clusterWith({
          prometheus: {
            ...service,
            directUrl: "https://mimir.example.com/",
            bearerToken: "some-token",
            customHeaders: tenant,
          },
        }),
        servicePath,
        { query: "up" },
      );

      expect(k8sRequest).not.toHaveBeenCalled();
      expect(proxyFetch).toHaveBeenCalledWith(
        "https://mimir.example.com/prometheus/api/v1/query_range",
        expect.objectContaining({
          method: "POST",
          headers: { Authorization: "Bearer some-token", ...tenant, ...formContentType },
          body: "query=up",
        }),
      );
    });

    it("upgrades an http URL to https when HTTPS is enabled", async () => {
      await getMetrics(
        clusterWith({
          prometheusRequestMethod: "GET",
          prometheus: { ...service, directUrl: "http://mimir.example.com", https: true },
        }),
        servicePath,
        { query: "up" },
      );

      expect(proxyFetch).toHaveBeenCalledWith(
        "https://mimir.example.com/prometheus/api/v1/query_range?query=up",
        expect.objectContaining({ method: "GET" }),
      );
    });
  });
});
