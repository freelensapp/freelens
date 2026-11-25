/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { backoffCaller, byOrderNumber } from "@freelensapp/utilities";
import { getInjectable } from "@ogre-tools/injectable";
import { limitAsync } from "es-toolkit";
import { apiVersionsRequesterInjectionToken } from "./api-versions-requester";
import broadcastConnectionUpdateInjectable from "./broadcast-connection-update.injectable";
import requestKubeApiResourcesForInjectable from "./request-kube-api-resources-for.injectable";

import type { AsyncResult } from "@freelensapp/utilities";

import type { Cluster } from "../../common/cluster/cluster";
import type { KubeApiResource } from "../../common/rbac";
import type { KubeResourceListGroup } from "./api-versions-requester";

export interface RequestApiResourcesOptions {
  /**
   * Whether the resources are no longer wanted, as when the cluster was
   * disconnected while they were requested. The request then stops retrying and
   * fails without warnings.
   */
  isCanceled?: () => boolean;
}

export type RequestApiResources = (
  cluster: Cluster,
  options?: RequestApiResourcesOptions,
) => AsyncResult<KubeApiResource[], Error>;

const requestApiResourcesInjectable = getInjectable({
  id: "request-api-resources",
  instantiate: (di): RequestApiResources => {
    const logger = di.inject(loggerInjectionToken);
    const apiVersionRequesters = di.injectMany(apiVersionsRequesterInjectionToken).sort(byOrderNumber);
    const requestKubeApiResourcesFor = di.inject(requestKubeApiResourcesForInjectable);

    return async (cluster, { isCanceled = () => false } = {}) => {
      const canceled = () => ({
        callWasSuccessful: false as const,
        error: new Error("The request of the kube API resources was canceled"),
      });
      const broadcastConnectionUpdate = di.inject(broadcastConnectionUpdateInjectable, cluster);
      const requestKubeApiResourcesOfCluster = requestKubeApiResourcesFor(cluster);
      // Checked once a request is out of the queue, so that the queued ones of a
      // canceled request are not sent.
      const requestKubeApiResources = limitAsync(
        async (listGroup: KubeResourceListGroup) =>
          isCanceled() ? canceled() : requestKubeApiResourcesOfCluster(listGroup),
        5,
      );

      const groupLists: KubeResourceListGroup[] = [];

      for (const apiVersionRequester of apiVersionRequesters) {
        // `backoffCaller` cannot be stopped: a canceled attempt succeeds with
        // nothing, so that it does not retry.
        const result = await backoffCaller(
          async () =>
            isCanceled() ? { callWasSuccessful: true as const, response: [] } : apiVersionRequester.request(cluster),
          {
            onIntermediateError: (error, attempt) => {
              if (isCanceled()) {
                return;
              }

              broadcastConnectionUpdate({
                message: `Failed to list kube API resource kinds, attempt ${attempt}: ${error}`,
                level: "warning",
              });
              logger.warn(`[LIST-API-RESOURCES]: failed to list kube api resources: ${error}`, {
                attempt,
                clusterId: cluster.id,
              });
            },
          },
        );

        if (isCanceled()) {
          return canceled();
        }

        if (!result.callWasSuccessful) {
          return result;
        }

        for (const item of result.response) {
          groupLists.push(item);
        }
      }

      const apiResourceRequests = groupLists.map(async (listGroup) =>
        Object.assign(await requestKubeApiResources(listGroup), { listGroup }),
      );
      const results = await Promise.all(apiResourceRequests);

      if (isCanceled()) {
        return canceled();
      }

      const resources: KubeApiResource[] = [];

      for (const result of results) {
        if (!result.callWasSuccessful) {
          broadcastConnectionUpdate({
            message: `Kube APIs under "${result.listGroup.path}" may not be displayed`,
            level: "warning",
          });
          continue;
        }

        for (const item of result.response) {
          resources.push(item);
        }
      }

      return {
        callWasSuccessful: true,
        response: resources,
      };
    };
  },
});

export default requestApiResourcesInjectable;
