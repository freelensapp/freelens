/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import { MutatingAdmissionPolicyDetails } from "../../../config-mutating-admission-policies";
import currentKubeObjectInDetailsInjectable from "../../current-kube-object-in-details.injectable";
import { kubeObjectDetailItemInjectionToken } from "../kube-object-detail-item-injection-token";
import { kubeObjectMatchesToKindAndApiVersion } from "../kube-object-matches-to-kind-and-api-version";

const mutatingAdmissionPolicyDetailItemInjectable = getInjectable({
  id: "mutating-admission-policy-detail-item",

  instantiate(di) {
    const kubeObject = di.inject(currentKubeObjectInDetailsInjectable);

    return {
      Component: MutatingAdmissionPolicyDetails,
      enabled: computed(() => isMutatingAdmissionPolicy(kubeObject.value.get()?.object)),
      orderNumber: 10,
    };
  },

  injectionToken: kubeObjectDetailItemInjectionToken,
});

export const isMutatingAdmissionPolicy = kubeObjectMatchesToKindAndApiVersion("MutatingAdmissionPolicy", [
  "admissionregistration.k8s.io/v1alpha1",
  "admissionregistration.k8s.io/v1beta1",
  "admissionregistration.k8s.io/v1",
]);

export default mutatingAdmissionPolicyDetailItemInjectable;
