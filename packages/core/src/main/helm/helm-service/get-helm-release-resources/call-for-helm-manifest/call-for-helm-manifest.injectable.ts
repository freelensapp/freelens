/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { isObject } from "@freelensapp/utilities";
import { getInjectable } from "@ogre-tools/injectable";
import * as yaml from "js-yaml";
import execHelmInjectable, { proxyKubeconfigHelmOptions } from "../../../exec-helm/exec-helm.injectable";

import type { KubeJsonApiData, KubeJsonApiDataList } from "@freelensapp/kube-object";
import type { AsyncResult } from "@freelensapp/utilities";

import type { ProxyKubeconfigPaths } from "../../../../kubeconfig-manager/kubeconfig-manager";

const requestHelmManifestInjectable = getInjectable({
  id: "request-helm-manifest",

  instantiate: (di) => {
    const execHelm = di.inject(execHelmInjectable);

    return async (
      name: string,
      namespace: string,
      kubeconfig: ProxyKubeconfigPaths,
    ): AsyncResult<(KubeJsonApiData | KubeJsonApiDataList)[]> => {
      const result = await execHelm(
        ["get", "manifest", name, "--namespace", namespace, "--kubeconfig", kubeconfig.kubeconfigPath],
        proxyKubeconfigHelmOptions(kubeconfig),
      );

      if (!result.callWasSuccessful) {
        return { callWasSuccessful: false, error: result.error.message };
      }

      return {
        callWasSuccessful: true,
        response: yaml.loadAll(result.response).filter(isObject) as unknown as KubeJsonApiData[],
      };
    };
  },
});

export default requestHelmManifestInjectable;
