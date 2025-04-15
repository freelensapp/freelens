/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { clusterFrameChildComponentInjectionToken } from "@freelensapp/react-application";
import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import { ReplicaSetScaleDialog } from "./dialog";

const replicasetScaleDialogClusterFrameChildComponentInjectable = getInjectable({
  id: "replicaset-scale-dialog-cluster-frame-child-component",

  instantiate: () => ({
    id: "replicaset-scale-dialog",
    shouldRender: computed(() => true),
    Component: ReplicaSetScaleDialog,
  }),

  injectionToken: clusterFrameChildComponentInjectionToken,
});

export default replicasetScaleDialogClusterFrameChildComponentInjectable;
