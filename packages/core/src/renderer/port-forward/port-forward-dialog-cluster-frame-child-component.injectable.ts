/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { clusterFrameChildComponentInjectionToken } from "@freelensapp/react-application";
import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import { PortForwardDialog } from "./port-forward-dialog";

const portForwardDialogClusterFrameChildComponentInjectable = getInjectable({
  id: "port-forward-dialog-cluster-frame-child-component",

  instantiate: () => ({
    id: "port-forward-dialog",
    shouldRender: computed(() => true),
    Component: PortForwardDialog,
  }),

  injectionToken: clusterFrameChildComponentInjectionToken,
});

export default portForwardDialogClusterFrameChildComponentInjectable;
