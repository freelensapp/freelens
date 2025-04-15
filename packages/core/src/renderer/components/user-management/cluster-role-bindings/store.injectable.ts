import assert from "assert";
import {
  clusterRoleBindingApiInjectable,
  storesAndApisCanBeCreatedInjectionToken,
} from "@freelensapp/kube-api-specifics";
import { loggerInjectionToken } from "@freelensapp/logger";
/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import { kubeObjectStoreInjectionToken } from "../../../../common/k8s-api/api-manager/kube-object-store-token";
import clusterFrameContextForClusterScopedResourcesInjectable from "../../../cluster-frame-context/for-cluster-scoped-resources.injectable";
import { ClusterRoleBindingStore } from "./store";

const clusterRoleBindingStoreInjectable = getInjectable({
  id: "cluster-role-binding-store",
  instantiate: (di) => {
    assert(
      di.inject(storesAndApisCanBeCreatedInjectionToken),
      "clusterRoleBindingStore is only accessible in certain environments",
    );

    const api = di.inject(clusterRoleBindingApiInjectable);

    return new ClusterRoleBindingStore(
      {
        context: di.inject(clusterFrameContextForClusterScopedResourcesInjectable),
        logger: di.inject(loggerInjectionToken),
      },
      api,
    );
  },
  injectionToken: kubeObjectStoreInjectionToken,
});

export default clusterRoleBindingStoreInjectable;
