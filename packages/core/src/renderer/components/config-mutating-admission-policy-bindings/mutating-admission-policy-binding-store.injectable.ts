/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import {
  mutatingAdmissionPolicyBindingApiInjectable,
  storesAndApisCanBeCreatedInjectionToken,
} from "@freelensapp/kube-api-specifics";
import { loggerInjectionToken } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import { kubeObjectStoreInjectionToken } from "../../../common/k8s-api/api-manager/kube-object-store-token";
import clusterFrameContextForNamespacedResourcesInjectable from "../../cluster-frame-context/for-namespaced-resources.injectable";
import { MutatingAdmissionPolicyBindingStore } from "./mutating-admission-policy-binding-store";

const mutatingAdmissionPolicyBindingStoreInjectable = getInjectable({
  id: "mutating-admission-policy-binding-store",
  instantiate: (di) => {
    if (!di.inject(storesAndApisCanBeCreatedInjectionToken)) {
      throw new Error("mutatingAdmissionPolicyBindingStore is only available in certain environments");
    }

    const api = di.inject(mutatingAdmissionPolicyBindingApiInjectable);

    return new MutatingAdmissionPolicyBindingStore(
      {
        context: di.inject(clusterFrameContextForNamespacedResourcesInjectable),
        logger: di.inject(loggerInjectionToken),
      },
      api,
    );
  },
  injectionToken: kubeObjectStoreInjectionToken,
});

export default mutatingAdmissionPolicyBindingStoreInjectable;
