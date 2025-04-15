/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { parseKubeApi } from "@freelensapp/kube-api";
import type { KubeJsonApiData, KubeObjectMetadata, KubeObjectScope } from "@freelensapp/kube-object";
import { KubeObject } from "@freelensapp/kube-object";
import type { AsyncResult } from "@freelensapp/utilities";
import { getInjectable } from "@ogre-tools/injectable";
import type { Writable } from "type-fest";
import { getErrorMessage } from "../../../../../common/utils/get-error-message";
import apiKubeGetInjectable from "../../../../k8s/api-kube-get.injectable";

export type RequestKubeResource = (selfLink: string) => AsyncResult<KubeObject | undefined>;

const requestKubeResourceInjectable = getInjectable({
  id: "request-kube-resource",

  instantiate: (di): RequestKubeResource => {
    const apiKubeGet = di.inject(apiKubeGetInjectable);

    return async (selfLink) => {
      const parsed = parseKubeApi(selfLink);

      if (!parsed?.name) {
        return { callWasSuccessful: false, error: "Invalid API path" };
      }

      try {
        const rawData = (await apiKubeGet(selfLink)) as KubeJsonApiData<
          KubeObjectMetadata<KubeObjectScope>,
          unknown,
          unknown
        >;

        (rawData.metadata as Writable<typeof rawData.metadata>).selfLink = selfLink;

        return {
          callWasSuccessful: true,
          response: new KubeObject(rawData),
        };
      } catch (e) {
        return { callWasSuccessful: false, error: getErrorMessage(e) };
      }
    };
  },
});

export default requestKubeResourceInjectable;
