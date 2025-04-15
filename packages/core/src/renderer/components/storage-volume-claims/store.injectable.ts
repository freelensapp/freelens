/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import assert from "assert";
import {
  persistentVolumeClaimApiInjectable,
  storesAndApisCanBeCreatedInjectionToken,
} from "@freelensapp/kube-api-specifics";
import { loggerInjectionToken } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import { kubeObjectStoreInjectionToken } from "../../../common/k8s-api/api-manager/kube-object-store-token";
import clusterFrameContextForNamespacedResourcesInjectable from "../../cluster-frame-context/for-namespaced-resources.injectable";
import { PersistentVolumeClaimStore } from "./store";

const persistentVolumeClaimStoreInjectable = getInjectable({
  id: "persistent-volume-claim-store",
  instantiate: (di) => {
    assert(
      di.inject(storesAndApisCanBeCreatedInjectionToken),
      "persistentVolumeClaimStore is only available in certain environments",
    );

    const api = di.inject(persistentVolumeClaimApiInjectable);

    return new PersistentVolumeClaimStore(
      {
        context: di.inject(clusterFrameContextForNamespacedResourcesInjectable),
        logger: di.inject(loggerInjectionToken),
      },
      api,
    );
  },
  injectionToken: kubeObjectStoreInjectionToken,
});

export default persistentVolumeClaimStoreInjectable;
