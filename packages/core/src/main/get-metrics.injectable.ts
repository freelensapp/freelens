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

export type GetMetrics = (
  cluster: Cluster,
  prometheusPath: string,
  queryParams: RequestMetricsParams & { query: string },
) => Promise<unknown>;

const getMetricsInjectable = getInjectable({
  id: "get-metrics",

  instantiate: (di): GetMetrics => {
    const k8sRequest = di.inject(k8sRequestInjectable);
    const proxyFetch = di.inject(proxyFetchInjectable);

    return async (cluster, prometheusPath, queryParams) => {
      const prometheusPrefix = cluster.preferences.prometheus?.prefix || "";
      const body = new URLSearchParams();

      for (const [key, value] of object.entries(queryParams)) {
        body.append(key, value.toString());
      }

      const directUrl = cluster.preferences.prometheus?.directUrl;

      if (directUrl) {
        // Direct request to Prometheus, bypassing K8s service proxy.
        // Used for environments like OpenShift where Prometheus requires
        // bearer token authentication via kube-rbac-proxy.
        const url = `${directUrl.replace(/\/+$/, "")}${prometheusPrefix}/api/v1/query_range`;
        const headers: Record<string, string> = {
          "Content-Type": "application/x-www-form-urlencoded",
        };
        const bearerToken = cluster.preferences.prometheus?.bearerToken;

        if (bearerToken) {
          headers["Authorization"] = `Bearer ${bearerToken}`;
        }

        const response = await proxyFetch(url, {
          method: "POST",
          headers,
          body: body.toString(),
        });

        if (!response.ok) {
          throw new Error(
            `Failed to POST ${url} for clusterId=${cluster.id}: ${response.statusText}`,
            { cause: response },
          );
        }

        return response.json();
      }

      const metricsPath = `/api/v1/namespaces/${prometheusPath}/proxy${prometheusPrefix}/api/v1/query_range`;

      return k8sRequest(cluster, metricsPath, {
        timeout: 0,
        method: "POST",
        body,
      });
    };
  },
});

export default getMetricsInjectable;
