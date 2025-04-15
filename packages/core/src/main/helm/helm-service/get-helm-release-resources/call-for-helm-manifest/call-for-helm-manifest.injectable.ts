/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { KubeJsonApiData, KubeJsonApiDataList } from "@freelensapp/kube-object";
import type { AsyncResult } from "@freelensapp/utilities";
import { isObject } from "@freelensapp/utilities";
import { getInjectable } from "@ogre-tools/injectable";
import yaml from "js-yaml";
import execHelmInjectable from "../../../exec-helm/exec-helm.injectable";

const requestHelmManifestInjectable = getInjectable({
  id: "request-helm-manifest",

  instantiate: (di) => {
    const execHelm = di.inject(execHelmInjectable);

    return async (
      name: string,
      namespace: string,
      kubeconfigPath: string,
    ): AsyncResult<(KubeJsonApiData | KubeJsonApiDataList)[]> => {
      const result = await execHelm([
        "get",
        "manifest",
        name,
        "--namespace",
        namespace,
        "--kubeconfig",
        kubeconfigPath,
      ]);

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
