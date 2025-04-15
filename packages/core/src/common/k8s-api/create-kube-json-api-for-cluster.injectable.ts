/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { KubeJsonApi } from "@freelensapp/kube-api";
import { getInjectable } from "@ogre-tools/injectable";
import { apiKubePrefix } from "../vars";
import isDebuggingInjectable from "../vars/is-debugging.injectable";
import { apiBaseHostHeaderInjectionToken, apiBaseServerAddressInjectionToken } from "./api-base-configs";
import createKubeJsonApiInjectable from "./create-kube-json-api.injectable";

export type CreateKubeJsonApiForCluster = (clusterId: string) => KubeJsonApi;

const createKubeJsonApiForClusterInjectable = getInjectable({
  id: "create-kube-json-api-for-cluster",
  instantiate: (di): CreateKubeJsonApiForCluster => {
    const createKubeJsonApi = di.inject(createKubeJsonApiInjectable);
    const isDebugging = di.inject(isDebuggingInjectable);

    return (clusterId) =>
      createKubeJsonApi(
        {
          serverAddress: di.inject(apiBaseServerAddressInjectionToken),
          apiBase: apiKubePrefix,
          debug: isDebugging,
        },
        {
          headers: {
            Host: `${clusterId}.${di.inject(apiBaseHostHeaderInjectionToken)}`,
          },
        },
      );
  },
});

export default createKubeJsonApiForClusterInjectable;
