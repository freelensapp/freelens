/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { object } from "@freelensapp/utilities";
import { getInjectable } from "@ogre-tools/injectable";
import proxyFetchInjectable from "./fetch/proxy-fetch.injectable";
import k8sRequestInjectable from "./k8s-request.injectable";

import type { Logger } from "@freelensapp/logger";

import type { Cluster } from "../common/cluster/cluster";
import type { RequestMetricsParams } from "../common/k8s-api/endpoints/metrics.api/request-metrics.injectable";
import type { ProxyFetch } from "./fetch/proxy-fetch.injectable";

export type GetMetrics = (
  cluster: Cluster,
  prometheusPath: string,
  queryParams: RequestMetricsParams & { query: string },
) => Promise<unknown>;

/**
 * Fetch metrics directly from a Prometheus-compatible URL, bypassing the K8s
 * service proxy. Used when a directUrl is configured (e.g. OpenShift routes,
 * external Mimir endpoints with custom headers such as X-Scope-OrgID).
 */
async function fetchDirectMetrics(
  proxyFetch: ProxyFetch,
  logger: Logger,
  cluster: Cluster,
  prometheusPrefix: string,
  directUrl: string,
  requestMethod: "GET" | "POST",
  params: URLSearchParams,
): Promise<unknown> {
  const queryRangePath = `${directUrl.replace(/\/+$/, "")}${prometheusPrefix}/api/v1/query_range`;
  const url = requestMethod === "GET" ? `${queryRangePath}?${params.toString()}` : queryRangePath;
  const headers: Record<string, string> = {};
  const bearerToken = cluster.preferences.prometheus?.bearerToken;
  const customHeaders = cluster.preferences.prometheus?.customHeaders;

  if (bearerToken) {
    headers.Authorization = `Bearer ${bearerToken}`;
  }

  if (customHeaders) {
    Object.assign(headers, customHeaders);
  }

  if (requestMethod === "POST") {
    headers["Content-Type"] = "application/x-www-form-urlencoded;charset=UTF-8";
  }

  logger.debug(`[GET-METRICS]: fetching direct metrics from ${url} for clusterId=${cluster.id}`);

  const response = await proxyFetch(url, {
    method: requestMethod,
    headers,
    body: requestMethod === "POST" ? params.toString() : undefined,
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "<unreadable>");

    throw new Error(
      `Failed to ${requestMethod} ${url} for clusterId=${cluster.id}: ${response.status} ${response.statusText} — ${body}`,
      { cause: response },
    );
  }

  return response.json();
}

const getMetricsInjectable = getInjectable({
  id: "get-metrics",

  instantiate: (di): GetMetrics => {
    const k8sRequest = di.inject(k8sRequestInjectable);
    const proxyFetch = di.inject(proxyFetchInjectable);
    const logger = di.inject(loggerInjectionToken);

    return async (cluster, prometheusPath, queryParams) => {
      const prometheusPrefix = cluster.preferences.prometheus?.prefix || "";
      const requestMethod = cluster.preferences.prometheusRequestMethod === "GET" ? "GET" : "POST";
      const params = new URLSearchParams();

      for (const [key, value] of object.entries(queryParams)) {
        params.append(key, value.toString());
      }

      const directUrl = cluster.preferences.prometheus?.directUrl;

      if (directUrl) {
        return fetchDirectMetrics(proxyFetch, logger, cluster, prometheusPrefix, directUrl, requestMethod, params);
      }

      const queryRangePath = `/api/v1/namespaces/${prometheusPath}/proxy${prometheusPrefix}/api/v1/query_range`;

      if (requestMethod === "GET") {
        return k8sRequest(cluster, `${queryRangePath}?${params.toString()}`, {
          timeout: 0,
          method: "GET",
        });
      }

      return k8sRequest(cluster, queryRangePath, {
        timeout: 0,
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        },
        body: params.toString(),
      });
    };
  },
});

export default getMetricsInjectable;
