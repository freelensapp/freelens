/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import { ServiceAccountMenu } from "../../user-management/service-accounts/service-account-menu";
import type { KubeObjectMenuItemComponent } from "../kube-object-menu-item-injection-token";
import { kubeObjectMenuItemInjectionToken } from "../kube-object-menu-item-injection-token";

const serviceAccountMenuInjectable = getInjectable({
  id: "service-account-menu-kube-object-menu",

  instantiate: () => ({
    kind: "ServiceAccount",
    apiVersions: ["v1"],
    Component: ServiceAccountMenu as KubeObjectMenuItemComponent,
    enabled: computed(() => true),
    orderNumber: 10,
  }),

  injectionToken: kubeObjectMenuItemInjectionToken,
});

export default serviceAccountMenuInjectable;
