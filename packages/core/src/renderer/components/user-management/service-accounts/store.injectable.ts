/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import assert from "assert";
import { serviceAccountApiInjectable, storesAndApisCanBeCreatedInjectionToken } from "@freelensapp/kube-api-specifics";
import { loggerInjectionToken } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import { kubeObjectStoreInjectionToken } from "../../../../common/k8s-api/api-manager/kube-object-store-token";
import clusterFrameContextForNamespacedResourcesInjectable from "../../../cluster-frame-context/for-namespaced-resources.injectable";
import { ServiceAccountStore } from "./store";

const serviceAccountStoreInjectable = getInjectable({
  id: "service-account-store",
  instantiate: (di) => {
    assert(
      di.inject(storesAndApisCanBeCreatedInjectionToken),
      "serviceAccountStore is only available in certain environments",
    );

    const api = di.inject(serviceAccountApiInjectable);

    return new ServiceAccountStore(
      {
        context: di.inject(clusterFrameContextForNamespacedResourcesInjectable),
        logger: di.inject(loggerInjectionToken),
      },
      api,
    );
  },
  injectionToken: kubeObjectStoreInjectionToken,
});

export default serviceAccountStoreInjectable;
