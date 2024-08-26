/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import assert from "assert";
import { IngressClassApi } from "@freelensapp/kube-api";
import { kubeApiInjectionToken } from "./token";
import { logErrorInjectionToken, logInfoInjectionToken, logWarningInjectionToken } from "@freelensapp/logger";
import { maybeKubeApiInjectable } from "./maybe-kube-api.injectable";
import { storesAndApisCanBeCreatedInjectionToken } from "./can-be-created-token";

export const ingressClassApiInjectable = getInjectable({
  id: "ingress-class-api",
  instantiate: (di) => {
    assert(
      di.inject(storesAndApisCanBeCreatedInjectionToken),
      "horizontalPodAutoscalerApi is only available in certain environments",
    );

    return new IngressClassApi({
      logError: di.inject(logErrorInjectionToken),
      logInfo: di.inject(logInfoInjectionToken),
      logWarn: di.inject(logWarningInjectionToken),
      maybeKubeApi: di.inject(maybeKubeApiInjectable),
    });
  },

  injectionToken: kubeApiInjectionToken,
});
