/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { createKubeApiURL, type KubeApiPatchType, patchTypeHeaders } from "@freelensapp/kube-api";
import { logWarningInjectionToken } from "@freelensapp/logger";
import { lowerAndPluralize } from "@freelensapp/utilities";
import { getInjectable } from "@ogre-tools/injectable";
import createKubeJsonApiInjectable from "../../../../common/k8s-api/create-kube-json-api.injectable";
import loadProxyKubeconfigInjectable from "../../../../main/cluster/load-proxy-kubeconfig.injectable";
import getClusterByIdInjectable from "../../storage/common/get-by-id.injectable";

import type { KubeJsonApiData } from "@freelensapp/kube-object";

import type { Patch as JsonPatch } from "rfc6902";
import type { PartialDeep } from "type-fest";

import type { ExecuteOnClusterRequest, ExecuteOnClusterResponse } from "../common/types";

type ExecuteOnClusterHandler = (request: ExecuteOnClusterRequest) => Promise<ExecuteOnClusterResponse>;

const executeOnClusterHandlerInjectable = getInjectable({
  id: "execute-on-cluster-handler",

  instantiate: (di): ExecuteOnClusterHandler => {
    const getClusterById = di.inject(getClusterByIdInjectable);
    const createKubeJsonApi = di.inject(createKubeJsonApiInjectable);
    const logWarn = di.inject(logWarningInjectionToken);

    return async (request: ExecuteOnClusterRequest): Promise<ExecuteOnClusterResponse> => {
      const { clusterId, operation, resource, body } = request;
      const patchType: KubeApiPatchType = request.patchType ?? "strategic";

      const cluster = getClusterById(clusterId);

      if (!cluster) {
        logWarn(`[execute-api] Cluster not found: ${clusterId}`);
        return {
          success: false,
          error: {
            message: "Cluster not available. Ensure cluster is connected.",
            code: 503,
            reason: "ClusterNotAccessible",
          },
        };
      }

      if (!cluster.accessible.get()) {
        logWarn(`[execute-api] Cluster not accessible (auth proxy not running): ${clusterId}`);
        return {
          success: false,
          error: {
            message: "Cluster not available. Ensure cluster is connected.",
            code: 503,
            reason: "ClusterNotAccessible",
          },
        };
      }

      try {
        const loadProxyKubeconfig = di.inject(loadProxyKubeconfigInjectable, cluster);
        const kubeconfig = await loadProxyKubeconfig();

        const contextName = cluster.contextName.get();
        const context = kubeconfig.getContextObject(contextName);
        const clusterConfig = kubeconfig.getCluster(context?.cluster ?? "");

        if (!clusterConfig?.server) {
          logWarn(`[execute-api] No server in kubeconfig for cluster: ${clusterId}`);
          return {
            success: false,
            error: {
              message: "Failed to load cluster configuration.",
              code: 500,
              reason: "ConfigurationError",
            },
          };
        }

        const api = createKubeJsonApi({
          serverAddress: clusterConfig.server,
          apiBase: "",
        });

        const isCore = !resource.apiVersion.includes("/");
        const url = createKubeApiURL({
          apiPrefix: isCore ? "/api" : "/apis",
          apiVersion: resource.apiVersion,
          resource: lowerAndPluralize(resource.kind),
          namespace: resource.namespace,
          name: resource.name,
        });

        const query: Record<string, string> = {};

        if (resource.labelSelector) {
          query.labelSelector = resource.labelSelector;
        }

        if (resource.fieldSelector) {
          query.fieldSelector = resource.fieldSelector;
        }

        const queryParams = Object.keys(query).length > 0 ? { query } : undefined;

        const operationHandlers: Record<string, () => Promise<unknown>> = {
          list: () => api.get(url, queryParams),
          get: () => api.get(url, queryParams),
          create: () => api.post(url, { data: body as PartialDeep<KubeJsonApiData> }),
          update: () => api.put(url, { data: body as PartialDeep<KubeJsonApiData> }),
          patch: () =>
            api.patch(
              url,
              { data: patchType === "json" ? (body as JsonPatch) : (body as PartialDeep<KubeJsonApiData>) },
              { headers: { "content-type": patchTypeHeaders[patchType] } },
            ),
          delete: () => api.del(url),
        };

        const handler = operationHandlers[operation];

        if (!handler) {
          return {
            success: false,
            error: {
              message: `Unknown operation: ${operation}`,
              code: 400,
              reason: "BadRequest",
            },
          };
        }

        const data = await handler();

        return { success: true, data };
      } catch (error) {
        const errorObj = error as Record<string, unknown>;

        return {
          success: false,
          error: {
            message: errorObj?.message?.toString() ?? (error instanceof Error ? error.message : "Unknown error"),
            code: typeof errorObj?.code === "number" ? errorObj.code : undefined,
            reason: typeof errorObj?.reason === "string" ? errorObj.reason : undefined,
          },
        };
      }
    };
  },
});

export default executeOnClusterHandlerInjectable;
