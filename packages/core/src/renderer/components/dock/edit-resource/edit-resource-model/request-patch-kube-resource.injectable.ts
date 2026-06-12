/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { patchTypeHeaders } from "@freelensapp/kube-api";
import { getInjectable } from "@ogre-tools/injectable";
import { getErrorMessage } from "../../../../../common/utils/get-error-message";
import apiKubePatchInjectable from "../../../../k8s/api-kube-patch.injectable";

import type { KubeApiPatchType } from "@freelensapp/kube-api";
import type { AsyncResult } from "@freelensapp/utilities";

import type { JsonPatch } from "../../../../../common/k8s-api/kube-object.store";

export interface PatchKubeResourceOptions {
  strategy?: KubeApiPatchType;
  subResource?: string;
}

export type RequestPatchKubeResource = (
  selfLink: string,
  patch: JsonPatch | Record<string, unknown>,
  options?: PatchKubeResourceOptions,
) => AsyncResult<{ name: string; kind: string }>;

const requestPatchKubeResourceInjectable = getInjectable({
  id: "request-patch-kube-resource",
  instantiate: (di): RequestPatchKubeResource => {
    const apiKubePatch = di.inject(apiKubePatchInjectable);

    return async (selfLink, patch, options = {}) => {
      const strategy = options.strategy ?? "json";
      const targetSelfLink = options.subResource ? `${selfLink}/${options.subResource}` : selfLink;

      try {
        const { metadata, kind } = await apiKubePatch(
          targetSelfLink,
          { data: patch },
          {
            headers: {
              "content-type": patchTypeHeaders[strategy],
            },
          },
        );

        return {
          callWasSuccessful: true,
          response: { name: metadata.name, kind },
        };
      } catch (e) {
        return {
          callWasSuccessful: false,
          error: getErrorMessage(e),
        };
      }
    };
  },
});

export default requestPatchKubeResourceInjectable;
