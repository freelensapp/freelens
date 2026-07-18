/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import { ReferenceGrantDetails } from "../../../gateway-api/reference-grants/reference-grant-details";
import currentKubeObjectInDetailsInjectable from "../../current-kube-object-in-details.injectable";
import { kubeObjectDetailItemInjectionToken } from "../kube-object-detail-item-injection-token";
import { kubeObjectMatchesToKindAndApiVersion } from "../kube-object-matches-to-kind-and-api-version";

const isReferenceGrant = kubeObjectMatchesToKindAndApiVersion("ReferenceGrant", ["gateway.networking.k8s.io/v1beta1"]);

const referenceGrantDetailItemInjectable = getInjectable({
  id: "reference-grant-detail-item",
  instantiate: (di) => {
    const kubeObject = di.inject(currentKubeObjectInDetailsInjectable);

    return {
      Component: ReferenceGrantDetails,
      enabled: computed(() => isReferenceGrant(kubeObject.value.get()?.object)),
      orderNumber: 10,
    };
  },
  injectionToken: kubeObjectDetailItemInjectionToken,
});

export default referenceGrantDetailItemInjectable;
