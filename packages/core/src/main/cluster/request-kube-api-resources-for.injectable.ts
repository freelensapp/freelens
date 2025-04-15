/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { V1APIResourceList } from "@freelensapp/kubernetes-client-node";
import type { AsyncResult } from "@freelensapp/utilities";
import { getInjectable } from "@ogre-tools/injectable";
import type { Cluster } from "../../common/cluster/cluster";
import type { KubeApiResource } from "../../common/rbac";
import k8sRequestInjectable from "../k8s-request.injectable";
import type { KubeResourceListGroup } from "./api-versions-requester";

export type RequestKubeApiResources = (grouping: KubeResourceListGroup) => AsyncResult<KubeApiResource[], Error>;

export type RequestKubeApiResourcesFor = (cluster: Cluster) => RequestKubeApiResources;

const requestKubeApiResourcesForInjectable = getInjectable({
  id: "request-kube-api-resources-for",
  instantiate: (di): RequestKubeApiResourcesFor => {
    const k8sRequest = di.inject(k8sRequestInjectable);

    return (cluster) =>
      async ({ group, path }) => {
        try {
          const { resources } = (await k8sRequest(cluster, path)) as V1APIResourceList;

          return {
            callWasSuccessful: true,
            response: resources.map((resource) => ({
              apiName: resource.name,
              kind: resource.kind,
              group,
              namespaced: resource.namespaced,
            })),
          };
        } catch (error) {
          return {
            callWasSuccessful: false,
            error: error as Error,
          };
        }
      };
  },
});

export default requestKubeApiResourcesForInjectable;
