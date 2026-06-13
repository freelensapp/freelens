/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { object } from "@freelensapp/utilities";
import { getInjectable } from "@ogre-tools/injectable";
import proxyFetchInjectable from "./fetch/proxy-fetch.injectable";
import k8sRequestInjectable from "./k8s-request.injectable";

import type { Cluster } from "../common/cluster/cluster";
import type { RequestMetricsParams } from "../common/k8s-api/endpoints/metrics.api/request-metrics.injectable";
import type { ProxyFetch } from "./fetch/proxy-fetch.injectable";

export type GetMetrics = (
  cluster: Cluster,
  prometheusPath: string,
  queryParams: RequestMetricsParams & { query: string },
) => Promise<unknown>;

/**
 * Fetch metrics directly from a Prometheus URL, bypassing the K8s service proxy.
 * Used for environments like OpenShift where Prometheus requires bearer token
 * authentication via kube-rbac-proxy.
 */
async function fetchDirectMetrics(
  proxyFetch: ProxyFetch,
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

  if (bearerToken) {
    headers.Authorization = `Bearer ${bearerToken}`;
  }

  if (requestMethod === "POST") {
    headers["Content-Type"] = "application/x-www-form-urlencoded;charset=UTF-8";
  }

  const response = await proxyFetch(url, {
    method: requestMethod,
    headers,
    body: requestMethod === "POST" ? params.toString() : undefined,
  });

  if (!response.ok) {
    throw new Error(`Failed to ${requestMethod} ${url} for clusterId=${cluster.id}: ${response.statusText}`, {
      cause: response,
    });
  }

  return response.json();
}

const getMetricsInjectable = getInjectable({
  id: "get-metrics",

  instantiate: (di): GetMetrics => {
    const k8sRequest = di.inject(k8sRequestInjectable);
    const proxyFetch = di.inject(proxyFetchInjectable);

    return async (cluster, prometheusPath, queryParams) => {
      const prometheusPrefix = cluster.preferences.prometheus?.prefix || "";
      const requestMethod = cluster.preferences.prometheusRequestMethod === "GET" ? "GET" : "POST";
      const params = new URLSearchParams();

      for (const [key, value] of object.entries(queryParams)) {
        params.append(key, value.toString());
      }

      const directUrl = cluster.preferences.prometheus?.directUrl;

      if (directUrl) {
        return fetchDirectMetrics(proxyFetch, cluster, prometheusPrefix, directUrl, requestMethod, params);
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
