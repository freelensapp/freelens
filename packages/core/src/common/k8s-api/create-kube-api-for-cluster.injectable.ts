/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { KubeApi } from "@freelensapp/kube-api";
import {
  logDebugInjectionToken,
  logErrorInjectionToken,
  logInfoInjectionToken,
  logWarningInjectionToken,
} from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import { apiKubePrefix } from "../vars";
import isDevelopmentInjectable from "../vars/is-development.injectable";
import { clusterApiAddressInjectionToken } from "./cluster-api-address-injection-token";
import createKubeJsonApiInjectable from "./create-kube-json-api.injectable";

import type { KubeApiOptions } from "@freelensapp/kube-api";
import type { KubeJsonApiDataFor, KubeObject, KubeObjectConstructor } from "@freelensapp/kube-object";

export type KubeApiConstructor<Object extends KubeObject, Api extends KubeApi<Object>> = new (
  apiOpts: KubeApiOptions<Object>,
) => Api;

export interface CreateKubeApiForLocalClusterConfig {
  metadata: {
    uid: string;
  };
}

export interface CreateKubeApiForCluster {
  <Object extends KubeObject, Api extends KubeApi<Object>, Data extends KubeJsonApiDataFor<Object>>(
    cluster: CreateKubeApiForLocalClusterConfig,
    kubeClass: KubeObjectConstructor<Object, Data>,
    apiClass: KubeApiConstructor<Object, Api>,
  ): Api;
  <Object extends KubeObject, Data extends KubeJsonApiDataFor<Object>>(
    cluster: CreateKubeApiForLocalClusterConfig,
    kubeClass: KubeObjectConstructor<Object, Data>,
    apiClass?: KubeApiConstructor<Object, KubeApi<Object>>,
  ): KubeApi<Object>;
}

const createKubeApiForClusterInjectable = getInjectable({
  id: "create-kube-api-for-cluster",
  instantiate: (di): CreateKubeApiForCluster => {
    const clusterApiAddress = di.inject(clusterApiAddressInjectionToken);
    const isDevelopment = di.inject(isDevelopmentInjectable);
    const createKubeJsonApi = di.inject(createKubeJsonApiInjectable);
    const logDebug = di.inject(logDebugInjectionToken);
    const logError = di.inject(logErrorInjectionToken);
    const logInfo = di.inject(logInfoInjectionToken);
    const logWarn = di.inject(logWarningInjectionToken);

    return (
      cluster: CreateKubeApiForLocalClusterConfig,
      kubeClass: KubeObjectConstructor<KubeObject, KubeJsonApiDataFor<KubeObject>>,
      apiClass?: KubeApiConstructor<KubeObject, KubeApi<KubeObject>>,
    ) => {
      const { serverAddress, hostHeader } = clusterApiAddress(cluster.metadata.uid);
      const request = createKubeJsonApi(
        {
          serverAddress,
          apiBase: apiKubePrefix,
          debug: isDevelopment,
        },
        hostHeader ? { headers: { Host: hostHeader } } : {},
      );

      if (apiClass) {
        return new apiClass({
          objectConstructor: kubeClass,
          request,
        });
      }

      return new KubeApi(
        {
          logDebug,
          logError,
          logInfo,
          logWarn,
          maybeKubeApi: undefined,
        },
        {
          objectConstructor: kubeClass,
          request,
        },
      );
    };
  },
});

export default createKubeApiForClusterInjectable;
