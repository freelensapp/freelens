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
  params: URLSearchParams,
): Promise<unknown> {
  const url = `${directUrl.replace(/\/+$/, "")}${prometheusPrefix}/api/v1/query_range?${params.toString()}`;
  const headers: Record<string, string> = {};
  const bearerToken = cluster.preferences.prometheus?.bearerToken;

  if (bearerToken) {
    headers.Authorization = `Bearer ${bearerToken}`;
  }

  const response = await proxyFetch(url, {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    throw new Error(`Failed to GET ${url} for clusterId=${cluster.id}: ${response.statusText}`, {
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
      const params = new URLSearchParams();

      for (const [key, value] of object.entries(queryParams)) {
        params.append(key, value.toString());
      }

      const directUrl = cluster.preferences.prometheus?.directUrl;

      if (directUrl) {
        return fetchDirectMetrics(proxyFetch, cluster, prometheusPrefix, directUrl, params);
      }

      const metricsPath = `/api/v1/namespaces/${prometheusPath}/proxy${prometheusPrefix}/api/v1/query_range?${params.toString()}`;

      return k8sRequest(cluster, metricsPath, {
        timeout: 0,
        method: "GET",
      });
    };
  },
});

export default getMetricsInjectable;
