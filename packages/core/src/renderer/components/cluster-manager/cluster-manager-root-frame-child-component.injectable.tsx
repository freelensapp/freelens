/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import React from "react";
import { getInjectable } from "@ogre-tools/injectable";
import { rootFrameChildComponentInjectionToken } from "@freelens/react-application";
import { ClusterManager } from "./cluster-manager";
import { computed } from "mobx";
import { ErrorBoundary } from "@freelens/error-boundary";

const clusterManagerRootFrameChildComponentInjectable = getInjectable({
  id: "cluster-manager-root-frame-child-component",

  instantiate: () => ({
    id: "cluster-manager",

    shouldRender: computed(() => true),

    Component: () => (
      <ErrorBoundary>
        <ClusterManager />
      </ErrorBoundary>
    ),
  }),

  injectionToken: rootFrameChildComponentInjectionToken,
});

export default clusterManagerRootFrameChildComponentInjectable;
