/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { parseKubeApi } from "@freelensapp/kube-api";
import type { KubeApi } from "@freelensapp/kube-api";
import { kubeApiInjectionToken } from "@freelensapp/kube-api-specifics";
import { getInjectable } from "@ogre-tools/injectable";

export type GetKubeApiFromPath = (apiPath: string) => KubeApi | undefined;

const getKubeApiFromPathInjectable = getInjectable({
  id: "get-kube-api-from-path",

  instantiate: (di): GetKubeApiFromPath => {
    const kubeApis = di.injectMany(kubeApiInjectionToken);

    return (apiPath: string) => {
      const parsed = parseKubeApi(apiPath);

      return kubeApis.find((api) => api.apiBase === parsed?.apiBase);
    };
  },
});

export default getKubeApiFromPathInjectable;
