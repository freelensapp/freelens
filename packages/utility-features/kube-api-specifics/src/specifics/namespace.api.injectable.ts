/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import assert from "assert";
import { storesAndApisCanBeCreatedInjectionToken } from "./can-be-created-token";
import { NamespaceApi } from "@freelens/kube-api";
import { kubeApiInjectionToken } from "./token";
import { logErrorInjectionToken, logInfoInjectionToken, logWarningInjectionToken } from "@freelens/logger";
import { maybeKubeApiInjectable } from "./maybe-kube-api.injectable";

export const namespaceApiInjectable = getInjectable({
  id: "namespace-api",

  instantiate: (di) => {
    assert(
      di.inject(storesAndApisCanBeCreatedInjectionToken),
      "namespaceApi is only available in certain environments",
    );

    return new NamespaceApi({
      logError: di.inject(logErrorInjectionToken),
      logInfo: di.inject(logInfoInjectionToken),
      logWarn: di.inject(logWarningInjectionToken),
      maybeKubeApi: di.inject(maybeKubeApiInjectable),
    });
  },

  injectionToken: kubeApiInjectionToken,
});
