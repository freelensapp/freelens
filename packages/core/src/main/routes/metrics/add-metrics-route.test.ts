/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Cluster } from "../../../common/cluster/cluster";
import prometheusHandlerInjectable from "../../cluster/prometheus-handler/prometheus-handler.injectable";
import getMetricsInjectable from "../../get-metrics.injectable";
import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import addMetricsRouteInjectable from "./add-metrics-route.injectable";

import type { Logger } from "@freelensapp/logger";
import type { PrometheusProvider } from "@freelensapp/prometheus";

import type { DiContainer } from "@ogre-tools/injectable";

import type { ClusterPrometheusHandler } from "../../cluster/prometheus-handler/prometheus-handler";

const proxyPath = "/api/v1/namespaces/monitoring/services/prometheus-operated:9090/proxy/api/v1/query_range";
const forbidden = JSON.stringify({
  kind: "Status",
  apiVersion: "v1",
  status: "Failure",
  message:
    'services "prometheus-operated:9090" is forbidden: User "system:serviceaccount:default:dev" cannot create resource "services/proxy" in API group "" in the namespace "monitoring"',
  reason: "Forbidden",
  code: 403,
});

// What k8sRequest throws for a status out of 2xx: it has read the body, keeps it in the message and in `error`, and
// gives the response, with its body used, as the cause.
async function requestError(status: number, body: string) {
  const response = new Response(body, { status });

  await response.text();

  return Object.assign(
    new Error(`Failed to POST ${proxyPath} for clusterId=some-cluster-id: ${body}`, { cause: response }),
    {
      statusCode: status,
      error: body,
    },
  );
}

const provider = {
  kind: "operator",
  name: "Prometheus Operator",
  isConfigurable: true,
  getQuery: () => "up",
  getPrometheusService: async () => undefined,
} as unknown as PrometheusProvider;

describe("the metrics route", () => {
  let di: DiContainer;
  let logger: Logger;
  let cluster: Cluster;
  let getPrometheusDetails: ClusterPrometheusHandler["getPrometheusDetails"];
  let getMetrics: (...args: unknown[]) => Promise<unknown>;

  const request = () =>
    di.inject(addMetricsRouteInjectable).handler({ cluster, payload: "up", query: new URLSearchParams() } as never);

  beforeEach(() => {
    di = getDiForUnitTesting();
    logger = { debug: vi.fn(), error: vi.fn(), info: vi.fn(), silly: vi.fn(), warn: vi.fn() } as unknown as Logger;
    getPrometheusDetails = async () => ({ prometheusPath: "monitoring/services/prometheus-operated:9090", provider });
    getMetrics = async () => ({});

    di.override(loggerInjectionToken, () => logger);
    di.override(prometheusHandlerInjectable, () => ({
      setupPrometheus: () => {},
      getPrometheusDetails: () => getPrometheusDetails(),
    }));
    di.override(
      getMetricsInjectable,
      () =>
        (...args) =>
          getMetrics(...args),
    );

    cluster = new Cluster({ contextName: "some-context", id: "some-cluster-id", kubeConfigPath: "/some/kubeconfig" });
  });

  it("logs why the API server refused a query through the proxy of the service", async () => {
    getMetrics = async () => {
      throw await requestError(403, forbidden);
    };

    await request();

    expect(logger.warn).toHaveBeenCalledWith(
      "[METRICS-ROUTE]: failed to get metrics for clusterId=some-cluster-id: Error: Metrics not available",
      { query: "up", status: 403, response: forbidden },
    );
  });

  it("logs the response of a query that Prometheus rejects through the proxy of the service", async () => {
    const rejected = JSON.stringify({ status: "error", errorType: "bad_data", error: 'invalid parameter "query"' });

    getMetrics = async () => {
      throw await requestError(422, rejected);
    };

    await request();

    expect(logger.warn).toHaveBeenCalledWith("[METRICS-ROUTE]: query failed for clusterId=some-cluster-id", {
      query: "up",
      status: 422,
      response: rejected,
    });
  });

  it("passes on to Prometheus only the parameters of a range query", async () => {
    const sentParams: unknown[] = [];

    getMetrics = async (...args: unknown[]) => {
      sentParams.push(args[2]);

      return {};
    };

    await di.inject(addMetricsRouteInjectable).handler({
      cluster,
      payload: "up",
      query: new URLSearchParams({ start: "100", end: "200", step: "60", kubernetes_namespace: "default" }),
    } as never);

    expect(sentParams).toEqual([{ query: "up", start: "100", end: "200", step: "60" }]);
  });

  describe("given a provider that has no query for some names", () => {
    let sentQueries: string[];

    beforeEach(() => {
      sentQueries = [];

      const partialProvider = {
        ...provider,
        getQuery: (opts: Record<string, string>, queryName: string) =>
          queryName === "unsupported" ? undefined : `${queryName}{cluster="${opts.clusterName ?? ""}"}`,
      } as PrometheusProvider;

      getPrometheusDetails = async () => ({
        prometheusPath: "gmp-public/services/frontend:9090",
        provider: partialProvider,
        queryOpts: { clusterName: "prod" },
      });
      getMetrics = async (...args: unknown[]) => {
        const { query } = args[2] as { query: string };

        sentQueries.push(query);

        return { status: "success", data: { resultType: "matrix", result: [{ metric: {}, values: [[1, query]] }] } };
      };
    });

    const requestNamed = () =>
      di.inject(addMetricsRouteInjectable).handler({
        cluster,
        payload: { cpuUsage: { category: "cluster" }, unsupported: { category: "cluster" } },
        query: new URLSearchParams(),
      } as never);

    it("sends only the queries the provider has, with the options of the service", async () => {
      await requestNamed();

      expect(sentQueries).toEqual(['cpuUsage{cluster="prod"}']);
    });

    it("answers the other names with an empty result", async () => {
      const { response } = (await requestNamed()) as { response: Record<string, unknown> };

      expect(response).toEqual({
        cpuUsage: {
          status: "success",
          data: { resultType: "matrix", result: [{ metric: {}, values: [[1, 'cpuUsage{cluster="prod"}']] }] },
        },
        unsupported: { status: "success", data: { resultType: "matrix", result: [] } },
      });
    });
  });

  describe("given a view whose queries Prometheus partly rejects", () => {
    const rejected = JSON.stringify({ status: "error", errorType: "execution", error: "some-execution-error" });
    const result = (query: string) => ({
      status: "success",
      data: { resultType: "matrix", result: [{ metric: {}, values: [[1, query]] }] },
    });

    beforeEach(() => {
      getPrometheusDetails = async () => ({
        prometheusPath: "monitoring/services/prometheus-operated:9090",
        provider: { ...provider, getQuery: (_opts: unknown, queryName: string) => queryName } as PrometheusProvider,
      });
    });

    const requestNamed = (...names: string[]) =>
      di.inject(addMetricsRouteInjectable).handler({
        cluster,
        payload: Object.fromEntries(names.map((name) => [name, { category: "nodes" }])),
        query: new URLSearchParams(),
      } as never) as Promise<{ response: Record<string, unknown> }>;

    it("answers the others, and the rejected ones with an empty result", async () => {
      getMetrics = async (...args: unknown[]) => {
        const { query } = args[2] as { query: string };

        if (query === "workloadMemoryUsage") {
          throw await requestError(422, rejected);
        }

        return result(query);
      };

      const { response } = await requestNamed("fsUsage", "workloadMemoryUsage", "fsSize");

      expect(response).toEqual({
        fsUsage: result("fsUsage"),
        workloadMemoryUsage: { status: "success", data: { resultType: "matrix", result: [] } },
        fsSize: result("fsSize"),
      });
      expect(cluster.metadata.prometheus).toMatchObject({ success: true });
      expect(logger.warn).toHaveBeenCalledWith("[METRICS-ROUTE]: query failed for clusterId=some-cluster-id", {
        query: "workloadMemoryUsage",
        status: 422,
        response: rejected,
      });
    });

    it("answers with no metrics when every query fails", async () => {
      getMetrics = async () => {
        throw await requestError(403, forbidden);
      };

      const { response } = await requestNamed("fsUsage", "fsSize");

      expect(response).toEqual({});
      expect(cluster.metadata.prometheus).toMatchObject({ success: false });
      expect(logger.warn).toHaveBeenCalledTimes(1);
    });
  });

  it("logs no details of the providers when no Prometheus service was found", async () => {
    getPrometheusDetails = async () => {
      throw new Error("No Prometheus service found", {
        cause: [
          new Error('Failed to find Prometheus provider for "Prometheus Operator"', {
            cause: new Error("Failed to list services in all namespaces: services is forbidden"),
          }),
          new Error('Failed to find Prometheus provider for "Lens"', {
            cause: new Error("No service found from any namespace"),
          }),
        ],
      });
    };

    await request();

    expect(logger.warn).toHaveBeenCalledWith(
      "[METRICS-ROUTE]: failed to get metrics for clusterId=some-cluster-id: Error: No Prometheus service found",
    );
  });
});
