/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import {
  storesAndApisCanBeCreatedInjectionToken,
  validatingAdmissionPolicyApiInjectable,
} from "@freelensapp/kube-api-specifics";
import { loggerInjectionToken } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import assert from "assert";
import { kubeObjectStoreInjectionToken } from "../../../common/k8s-api/api-manager/kube-object-store-token";
import clusterFrameContextForNamespacedResourcesInjectable from "../../cluster-frame-context/for-namespaced-resources.injectable";
import { ValidatingAdmissionPolicyStore } from "./validating-admission-policy-store";

const validatingAdmissionPolicyStoreInjectable = getInjectable({
  id: "validating-admission-policy-store",
  instantiate: (di) => {
    assert(
      di.inject(storesAndApisCanBeCreatedInjectionToken),
      "validatingAdmissionPolicyStore is only available in certain environments",
    );

    const api = di.inject(validatingAdmissionPolicyApiInjectable);

    return new ValidatingAdmissionPolicyStore(
      {
        context: di.inject(clusterFrameContextForNamespacedResourcesInjectable),
        logger: di.inject(loggerInjectionToken),
      },
      api,
    );
  },
  injectionToken: kubeObjectStoreInjectionToken,
});

export default validatingAdmissionPolicyStoreInjectable;
