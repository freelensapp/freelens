/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { ingressClassApiInjectable } from "@freelensapp/kube-api-specifics";
import type { IngressClass } from "@freelensapp/kube-object";
import { getInjectable, lifecycleEnum } from "@ogre-tools/injectable";
import ingressClassStoreInjectable from "./ingress-class-store.injectable";

export const ingressClassSetDefaultInjectable = getInjectable({
  id: "ingressClassSetDefaultInjectable",

  instantiate(di) {
    const api = di.inject(ingressClassApiInjectable);
    const store = di.inject(ingressClassStoreInjectable);

    return async (currentItem: IngressClass) => {
      const defaultIngressClassesUpdate = store.items
        .filter((item) => item.isDefault && currentItem !== item)
        .map((item) => api.setAsDefault({ name: item.getName() }, false));

      await Promise.all(defaultIngressClassesUpdate);
      await api.setAsDefault({ name: currentItem.getName() });
    };
  },

  lifecycle: lifecycleEnum.singleton,
});
