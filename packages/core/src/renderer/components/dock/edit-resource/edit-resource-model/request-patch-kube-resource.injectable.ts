/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { patchTypeHeaders } from "@freelensapp/kube-api";
import type { AsyncResult } from "@freelensapp/utilities";
import { getInjectable } from "@ogre-tools/injectable";
import type { JsonPatch } from "../../../../../common/k8s-api/kube-object.store";
import { getErrorMessage } from "../../../../../common/utils/get-error-message";
import apiKubePatchInjectable from "../../../../k8s/api-kube-patch.injectable";

export type RequestPatchKubeResource = (
  selfLink: string,
  patch: JsonPatch,
) => AsyncResult<{ name: string; kind: string }>;

const requestPatchKubeResourceInjectable = getInjectable({
  id: "request-patch-kube-resource",
  instantiate: (di): RequestPatchKubeResource => {
    const apiKubePatch = di.inject(apiKubePatchInjectable);

    return async (selfLink, patch) => {
      try {
        const { metadata, kind } = await apiKubePatch(
          selfLink,
          { data: patch },
          {
            headers: {
              "content-type": patchTypeHeaders.json,
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
