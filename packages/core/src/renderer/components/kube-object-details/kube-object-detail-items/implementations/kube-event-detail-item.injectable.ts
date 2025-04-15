/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import { KubeEventDetails } from "../../../events/kube-event-details";
import { kubeObjectDetailItemInjectionToken } from "../kube-object-detail-item-injection-token";

const kubeEventDetailItemInjectable = getInjectable({
  id: "kube-event-detail-item",

  instantiate: () => ({
    Component: KubeEventDetails,
    enabled: computed(() => true),
    orderNumber: Infinity,
  }),

  injectionToken: kubeObjectDetailItemInjectionToken,
});

export default kubeEventDetailItemInjectable;
