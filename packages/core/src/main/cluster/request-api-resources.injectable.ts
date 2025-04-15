/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { backoffCaller, byOrderNumber, withConcurrencyLimit } from "@freelensapp/utilities";
import type { AsyncResult } from "@freelensapp/utilities";
import { getInjectable } from "@ogre-tools/injectable";
import type { Cluster } from "../../common/cluster/cluster";
import type { KubeApiResource } from "../../common/rbac";
import { apiVersionsRequesterInjectionToken } from "./api-versions-requester";
import broadcastConnectionUpdateInjectable from "./broadcast-connection-update.injectable";
import requestKubeApiResourcesForInjectable from "./request-kube-api-resources-for.injectable";

export type RequestApiResources = (cluster: Cluster) => AsyncResult<KubeApiResource[], Error>;

export interface KubeResourceListGroup {
  group: string;
  path: string;
}

const requestApiResourcesInjectable = getInjectable({
  id: "request-api-resources",
  instantiate: (di): RequestApiResources => {
    const logger = di.inject(loggerInjectionToken);
    const apiVersionRequesters = di.injectMany(apiVersionsRequesterInjectionToken).sort(byOrderNumber);
    const requestKubeApiResourcesFor = di.inject(requestKubeApiResourcesForInjectable);

    return async (...args) => {
      const [cluster] = args;
      const broadcastConnectionUpdate = di.inject(broadcastConnectionUpdateInjectable, cluster);
      const requestKubeApiResources = withConcurrencyLimit(5)(requestKubeApiResourcesFor(cluster));

      const groupLists: KubeResourceListGroup[] = [];

      for (const apiVersionRequester of apiVersionRequesters) {
        const result = await backoffCaller(() => apiVersionRequester.request(cluster), {
          onIntermediateError: (error, attempt) => {
            broadcastConnectionUpdate({
              message: `Failed to list kube API resource kinds, attempt ${attempt}: ${error}`,
              level: "warning",
            });
            logger.warn(`[LIST-API-RESOURCES]: failed to list kube api resources: ${error}`, {
              attempt,
              clusterId: cluster.id,
            });
          },
        });

        if (!result.callWasSuccessful) {
          return result;
        }

        groupLists.push(...result.response);
      }

      const apiResourceRequests = groupLists.map(async (listGroup) =>
        Object.assign(await requestKubeApiResources(listGroup), { listGroup }),
      );
      const results = await Promise.all(apiResourceRequests);
      const resources: KubeApiResource[] = [];

      for (const result of results) {
        if (!result.callWasSuccessful) {
          broadcastConnectionUpdate({
            message: `Kube APIs under "${result.listGroup.path}" may not be displayed`,
            level: "warning",
          });
          continue;
        }

        resources.push(...result.response);
      }

      return {
        callWasSuccessful: true,
        response: resources,
      };
    };
  },
});

export default requestApiResourcesInjectable;
