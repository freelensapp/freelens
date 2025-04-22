/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { PodDisruptionBudget } from "@freelensapp/kube-object";
import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import { PodDisruptionBudgetDetails } from "../../../config-pod-disruption-budgets";
import currentKubeObjectInDetailsInjectable from "../../current-kube-object-in-details.injectable";
import { kubeObjectDetailItemInjectionToken } from "../kube-object-detail-item-injection-token";

const podDisruptionBudgetDetailItemInjectable = getInjectable({
  id: "pod-disruption-budget-detail-item",

  instantiate: (di) => {
    const kubeObject = di.inject(currentKubeObjectInDetailsInjectable);

    return {
      Component: PodDisruptionBudgetDetails,
      enabled: computed(() => kubeObject.value.get()?.object instanceof PodDisruptionBudget),
      orderNumber: 10,
    };
  },

  injectionToken: kubeObjectDetailItemInjectionToken,
});

export default podDisruptionBudgetDetailItemInjectable;
