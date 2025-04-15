/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { clusterFrameChildComponentInjectionToken } from "@freelensapp/react-application";
import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import { DeploymentScaleDialog } from "./dialog";

const deploymentScaleDialogClusterFrameChildComponentInjectable = getInjectable({
  id: "deployment-scale-dialog-cluster-frame-child-component",

  instantiate: () => ({
    id: "deployment-scale-dialog",
    shouldRender: computed(() => true),
    Component: DeploymentScaleDialog,
  }),

  injectionToken: clusterFrameChildComponentInjectionToken,
});

export default deploymentScaleDialogClusterFrameChildComponentInjectable;
