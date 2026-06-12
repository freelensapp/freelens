/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import { JobMenu } from "../../workloads-jobs/job-menu";
import { kubeObjectMenuItemInjectionToken } from "../kube-object-menu-item-injection-token";

import type { KubeObjectMenuItemComponent } from "../kube-object-menu-item-injection-token";

const jobMenuInjectable = getInjectable({
  id: "job-menu-kube-object-menu",

  instantiate: () => ({
    kind: "Job",
    apiVersions: ["batch/v1"],
    Component: JobMenu as KubeObjectMenuItemComponent,
    enabled: computed(() => true),
    orderNumber: 20,
  }),

  injectionToken: kubeObjectMenuItemInjectionToken,
});

export default jobMenuInjectable;
