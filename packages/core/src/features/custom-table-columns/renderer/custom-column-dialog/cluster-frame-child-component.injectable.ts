/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { clusterFrameChildComponentInjectionToken } from "@freelensapp/react-application";
import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import { CustomColumnDialog } from "./custom-column-dialog";

const customColumnDialogClusterFrameChildComponentInjectable = getInjectable({
  id: "custom-column-dialog-cluster-frame-child-component",

  instantiate: () => ({
    id: "custom-column-dialog",
    shouldRender: computed(() => true),
    Component: CustomColumnDialog,
  }),

  injectionToken: clusterFrameChildComponentInjectionToken,
});

export default customColumnDialogClusterFrameChildComponentInjectable;
