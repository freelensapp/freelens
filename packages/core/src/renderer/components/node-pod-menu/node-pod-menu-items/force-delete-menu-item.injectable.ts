
/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import { kubeObjectMenuItemInjectionToken } from "../../kube-object-menu/kube-object-menu-item-injection-token";
import { ForceDeleteMenuItem } from "../force-delete-menu-item";

import type { KubeObjectMenuItemComponent } from "../../kube-object-menu/kube-object-menu-item-injection-token";

const forceDeleteMenuItemInjectable = getInjectable({
  id: "force-delete-menu-item-node-pod-menu",

  instantiate: () => ({
    kind: "Pod",
    apiVersions: ["v1"],
    Component: ForceDeleteMenuItem as KubeObjectMenuItemComponent,
    enabled: computed(() => true),
    orderNumber: 10,
  }),
  injectionToken: kubeObjectMenuItemInjectionToken,
});

export default forceDeleteMenuItemInjectable;
