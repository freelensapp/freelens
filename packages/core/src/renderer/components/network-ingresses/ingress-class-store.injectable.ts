/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import assert from "assert";
import { getInjectable } from "@ogre-tools/injectable";
import { kubeObjectStoreInjectionToken } from "../../../common/k8s-api/api-manager/kube-object-store-token";
import { ingressClassApiInjectable, storesAndApisCanBeCreatedInjectionToken } from "@freelensapp/kube-api-specifics";
import { IngressClassStore } from "./ingress-class-store";
import clusterFrameContextForClusterScopedResourcesInjectable from "../../cluster-frame-context/for-cluster-scoped-resources.injectable";
import { loggerInjectionToken } from "@freelensapp/logger";

const ingressClassStoreInjectable = getInjectable({
  id: "ingress-class-store",

  instantiate: (di) => {
    assert(di.inject(storesAndApisCanBeCreatedInjectionToken), "ingressClassStore is only available in certain environments");

    const api = di.inject(ingressClassApiInjectable);

    return new IngressClassStore({
      context: di.inject(clusterFrameContextForClusterScopedResourcesInjectable),
      logger: di.inject(loggerInjectionToken),
    }, api);
  },

  injectionToken: kubeObjectStoreInjectionToken,
});

export default ingressClassStoreInjectable;
