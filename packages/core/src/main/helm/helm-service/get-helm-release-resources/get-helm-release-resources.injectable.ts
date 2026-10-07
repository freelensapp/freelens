/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import requestHelmManifestInjectable from "./call-for-helm-manifest/call-for-helm-manifest.injectable";

import type { KubeJsonApiData, KubeJsonApiDataList } from "@freelensapp/kube-object";
import type { AsyncResult } from "@freelensapp/utilities";

import type { ProxyKubeconfigPaths } from "../../../kubeconfig-manager/kubeconfig-manager";

export type GetHelmReleaseResources = (
  name: string,
  namespace: string,
  kubeconfig: ProxyKubeconfigPaths,
) => AsyncResult<KubeJsonApiData[], string>;

const getHelmReleaseResourcesInjectable = getInjectable({
  id: "get-helm-release-resources",

  instantiate: (di): GetHelmReleaseResources => {
    const requestHelmManifest = di.inject(requestHelmManifestInjectable);

    return async (name, namespace, kubeconfig) => {
      const result = await requestHelmManifest(name, namespace, kubeconfig);

      if (!result.callWasSuccessful) {
        return result;
      }

      return {
        callWasSuccessful: true,
        response: result.response.flatMap((item) =>
          Array.isArray(item.items) ? (item as KubeJsonApiDataList).items : (item as KubeJsonApiData),
        ),
      };
    };
  },
});

export default getHelmReleaseResourcesInjectable;
