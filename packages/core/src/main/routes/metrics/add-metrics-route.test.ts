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
  let getMetrics: () => Promise<unknown>;

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
    di.override(getMetricsInjectable, () => () => getMetrics());

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

  it("logs why each provider found no Prometheus service", async () => {
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
      [
        'Failed to find Prometheus provider for "Prometheus Operator": Failed to list services in all namespaces: services is forbidden',
        'Failed to find Prometheus provider for "Lens": No service found from any namespace',
      ],
    );
  });
});
