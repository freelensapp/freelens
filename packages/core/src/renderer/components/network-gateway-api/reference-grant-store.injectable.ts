/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { referenceGrantApiInjectable, storesAndApisCanBeCreatedInjectionToken } from "@freelensapp/kube-api-specifics";
import { loggerInjectionToken } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import assert from "assert";
import { kubeObjectStoreInjectionToken } from "../../../common/k8s-api/api-manager/kube-object-store-token";
import clusterFrameContextForNamespacedResourcesInjectable from "../../cluster-frame-context/for-namespaced-resources.injectable";
import { ReferenceGrantStore } from "./reference-grant-store";

const referenceGrantStoreInjectable = getInjectable({
  id: "reference-grant-store",
  instantiate: (di) => {
    assert(
      di.inject(storesAndApisCanBeCreatedInjectionToken),
      "referenceGrantStore is only available in certain environments",
    );

    const api = di.inject(referenceGrantApiInjectable);

    return new ReferenceGrantStore(
      {
        context: di.inject(clusterFrameContextForNamespacedResourcesInjectable),
        logger: di.inject(loggerInjectionToken),
      },
      api,
    );
  },
  injectionToken: kubeObjectStoreInjectionToken,
});

export default referenceGrantStoreInjectable;
