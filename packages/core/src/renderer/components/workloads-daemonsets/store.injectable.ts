/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import assert from "assert";
import getPodsByOwnerIdInjectable from "../workloads-pods/get-pods-by-owner-id.injectable";
import { daemonSetApiInjectable, storesAndApisCanBeCreatedInjectionToken } from "@freelens/kube-api-specifics";
import { kubeObjectStoreInjectionToken } from "../../../common/k8s-api/api-manager/kube-object-store-token";
import { DaemonSetStore } from "./store";
import clusterFrameContextForNamespacedResourcesInjectable from "../../cluster-frame-context/for-namespaced-resources.injectable";
import { loggerInjectionToken } from "@freelens/logger";

const daemonSetStoreInjectable = getInjectable({
  id: "daemon-set-store",
  instantiate: (di) => {
    assert(di.inject(storesAndApisCanBeCreatedInjectionToken), "daemonSetStore is only available in certain environments");

    const api = di.inject(daemonSetApiInjectable);

    return new DaemonSetStore({
      getPodsByOwnerId: di.inject(getPodsByOwnerIdInjectable),
      context: di.inject(clusterFrameContextForNamespacedResourcesInjectable),
      logger: di.inject(loggerInjectionToken),
    }, api);
  },
  injectionToken: kubeObjectStoreInjectionToken,
});

export default daemonSetStoreInjectable;
