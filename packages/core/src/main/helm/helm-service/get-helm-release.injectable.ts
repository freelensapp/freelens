/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { AsyncResult } from "@freelensapp/utilities";
import { getInjectable } from "@ogre-tools/injectable";
import type { Cluster } from "../../../common/cluster/cluster";
import type { HelmReleaseDataWithResources } from "../../../features/helm-releases/common/channels";
import kubeconfigManagerInjectable from "../../kubeconfig-manager/kubeconfig-manager.injectable";
import getHelmReleaseDataInjectable from "./get-helm-release-data.injectable";
import getHelmReleaseResourcesInjectable from "./get-helm-release-resources/get-helm-release-resources.injectable";

export interface GetHelmReleaseArgs {
  cluster: Cluster;
  releaseName: string;
  namespace: string;
}

export type GetHelmRelease = (args: GetHelmReleaseArgs) => AsyncResult<HelmReleaseDataWithResources, string>;

const getHelmReleaseInjectable = getInjectable({
  id: "get-helm-release",

  instantiate: (di): GetHelmRelease => {
    const getHelmReleaseData = di.inject(getHelmReleaseDataInjectable);
    const getHelmReleaseResources = di.inject(getHelmReleaseResourcesInjectable);

    return async ({ cluster, namespace, releaseName }) => {
      const proxyKubeconfigManager = di.inject(kubeconfigManagerInjectable, cluster);
      const proxyKubeconfigPath = await proxyKubeconfigManager.ensurePath();

      const releaseResult = await getHelmReleaseData(releaseName, namespace, proxyKubeconfigPath);

      if (!releaseResult.callWasSuccessful) {
        return {
          callWasSuccessful: false,
          error: `Failed to get helm release data: ${releaseResult.error}`,
        };
      }

      const resourcesResult = await getHelmReleaseResources(releaseName, namespace, proxyKubeconfigPath);

      if (!resourcesResult.callWasSuccessful) {
        return {
          callWasSuccessful: false,
          error: `Failed to get helm release resources: ${resourcesResult.error}`,
        };
      }

      return {
        callWasSuccessful: true,
        response: {
          ...releaseResult.response,
          resources: resourcesResult.response,
        },
      };
    };
  },

  causesSideEffects: true,
});

export default getHelmReleaseInjectable;
