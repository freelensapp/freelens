/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { clusterFrameChildComponentInjectionToken } from "@freelensapp/react-application";
import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import { KubeConfigDialog } from "./kubeconfig-dialog";

const kubeconfigDialogClusterFrameChildComponentInjectable = getInjectable({
  id: "kubeconfig-dialog-cluster-frame-child-component",

  instantiate: () => ({
    id: "kubeconfig-dialog",
    shouldRender: computed(() => true),
    Component: KubeConfigDialog,
  }),

  injectionToken: clusterFrameChildComponentInjectionToken,
});

export default kubeconfigDialogClusterFrameChildComponentInjectable;
