/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { apiKubePrefix } from "../vars";
import isDebuggingInjectable from "../vars/is-debugging.injectable";
import { clusterApiAddressInjectionToken } from "./cluster-api-address-injection-token";
import createKubeJsonApiInjectable from "./create-kube-json-api.injectable";

import type { KubeJsonApi } from "@freelensapp/kube-api";

export type CreateKubeJsonApiForCluster = (clusterId: string) => KubeJsonApi;

const createKubeJsonApiForClusterInjectable = getInjectable({
  id: "create-kube-json-api-for-cluster",
  instantiate: (di): CreateKubeJsonApiForCluster => {
    const createKubeJsonApi = di.inject(createKubeJsonApiInjectable);
    const isDebugging = di.inject(isDebuggingInjectable);
    const clusterApiAddress = di.inject(clusterApiAddressInjectionToken);

    return (clusterId) => {
      const { serverAddress, hostHeader } = clusterApiAddress(clusterId);

      return createKubeJsonApi(
        {
          serverAddress,
          apiBase: apiKubePrefix,
          debug: isDebugging,
        },
        hostHeader ? { headers: { Host: hostHeader } } : {},
      );
    };
  },
});

export default createKubeJsonApiForClusterInjectable;
