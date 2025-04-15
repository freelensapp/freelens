/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { clusterFrameChildComponentInjectionToken } from "@freelensapp/react-application";
import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import { Notifications } from "./notifications";

export const notificationsClusterFrameChildComponentInjectable = getInjectable({
  id: "notifications-cluster-frame-child-component",

  instantiate: () => ({
    id: "notifications",
    shouldRender: computed(() => true),
    Component: Notifications,
  }),

  injectionToken: clusterFrameChildComponentInjectionToken,
});
