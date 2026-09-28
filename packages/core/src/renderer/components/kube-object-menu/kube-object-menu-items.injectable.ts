/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable, lifecycleEnum } from "@ogre-tools/injectable";
import { computedInjectManyInjectionToken } from "@ogre-tools/injectable-extension-for-mobx";
import { sortBy } from "es-toolkit";
import { computed } from "mobx";
import { kubeObjectMenuItemInjectionToken } from "./kube-object-menu-item-injection-token";

import type { KubeObject } from "@freelensapp/kube-object";

const kubeObjectMenuItemsInjectable = getInjectable({
  id: "kube-object-menu-items",

  instantiate: (di, kubeObject: KubeObject) => {
    const computedInjectMany = di.inject(computedInjectManyInjectionToken);
    const menuItems = computedInjectMany(kubeObjectMenuItemInjectionToken);

    return computed(() =>
      sortBy(
        menuItems
          .get()
          .filter(
            (item) =>
              item.kind === kubeObject?.kind && item.apiVersions.includes(kubeObject?.apiVersion) && item.enabled.get(),
          ),
        [(item) => item.orderNumber],
      ).map((item) => item.Component),
    );
  },

  lifecycle: lifecycleEnum.keyedSingleton({
    getInstanceKey: (di, kubeObject: KubeObject) => kubeObject?.getId(),
  }),
});

export default kubeObjectMenuItemsInjectable;
