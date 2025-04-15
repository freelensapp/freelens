import assert from "assert";
import { statefulSetApiInjectable, storesAndApisCanBeCreatedInjectionToken } from "@freelensapp/kube-api-specifics";
import { loggerInjectionToken } from "@freelensapp/logger";
/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import { kubeObjectStoreInjectionToken } from "../../../common/k8s-api/api-manager/kube-object-store-token";
import clusterFrameContextForNamespacedResourcesInjectable from "../../cluster-frame-context/for-namespaced-resources.injectable";
import getPodsByOwnerIdInjectable from "../workloads-pods/get-pods-by-owner-id.injectable";
import { StatefulSetStore } from "./store";

const statefulSetStoreInjectable = getInjectable({
  id: "stateful-set-store",
  instantiate: (di) => {
    assert(
      di.inject(storesAndApisCanBeCreatedInjectionToken),
      "statefulSetStore is only available in certain environment",
    );

    const api = di.inject(statefulSetApiInjectable);

    return new StatefulSetStore(
      {
        getPodsByOwnerId: di.inject(getPodsByOwnerIdInjectable),
        context: di.inject(clusterFrameContextForNamespacedResourcesInjectable),
        logger: di.inject(loggerInjectionToken),
      },
      api,
    );
  },
  injectionToken: kubeObjectStoreInjectionToken,
});

export default statefulSetStoreInjectable;
