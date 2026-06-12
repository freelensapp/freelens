/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { iter } from "@freelensapp/utilities";
import { getInjectable } from "@ogre-tools/injectable";
import k8sRequestInjectable from "../k8s-request.injectable";
import { apiVersionsRequesterInjectionToken } from "./api-versions-requester";

import type { V1APIGroupList } from "@freelensapp/kubernetes-client-node";

const requestNonCoreApiVersionsInjectable = getInjectable({
  id: "request-non-core-api-versions",
  instantiate: (di) => {
    const k8sRequest = di.inject(k8sRequestInjectable);

    return {
      request: async (cluster) => {
        try {
          const { groups } = (await k8sRequest(cluster, "/apis")) as V1APIGroupList;

          return {
            callWasSuccessful: true,
            response: iter
              .chain(groups.values())
              .flatMap((group) =>
                group.versions.map((version) => ({
                  group: group.name,
                  path: `/apis/${version.groupVersion}`,
                })),
              )
              .collect((v) => [...v]),
          };
        } catch (error) {
          return {
            callWasSuccessful: false,
            error: error as Error,
          };
        }
      },
      orderNumber: 20,
    };
  },
  injectionToken: apiVersionsRequesterInjectionToken,
});

export default requestNonCoreApiVersionsInjectable;
