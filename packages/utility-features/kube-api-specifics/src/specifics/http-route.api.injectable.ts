/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { HTTPRouteApi } from "@freelensapp/kube-api";
import { logErrorInjectionToken, logInfoInjectionToken, logWarningInjectionToken } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import assert from "assert";
import { storesAndApisCanBeCreatedInjectionToken } from "./can-be-created-token";
import { maybeKubeApiInjectable } from "./maybe-kube-api.injectable";
import { kubeApiInjectionToken } from "./token";

export const httpRouteApiInjectable = getInjectable({
  id: "http-route-api",
  instantiate: (di) => {
    assert(
      di.inject(storesAndApisCanBeCreatedInjectionToken),
      "httpRouteApi is only available in certain environments",
    );

    return new HTTPRouteApi({
      logError: di.inject(logErrorInjectionToken),
      logInfo: di.inject(logInfoInjectionToken),
      logWarn: di.inject(logWarningInjectionToken),
      maybeKubeApi: di.inject(maybeKubeApiInjectable),
    });
  },

  injectionToken: kubeApiInjectionToken,
});
