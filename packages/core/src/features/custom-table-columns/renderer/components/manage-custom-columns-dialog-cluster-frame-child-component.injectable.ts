/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { clusterFrameChildComponentInjectionToken } from "@freelensapp/react-application";
import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import { ManageCustomColumnsDialog } from "./manage-custom-columns-dialog";

const manageCustomColumnsDialogClusterFrameChildComponentInjectable = getInjectable({
  id: "manage-custom-columns-dialog-cluster-frame-child-component",

  instantiate: () => ({
    id: "manage-custom-columns-dialog",
    shouldRender: computed(() => true),
    Component: ManageCustomColumnsDialog,
  }),

  injectionToken: clusterFrameChildComponentInjectionToken,
});

export default manageCustomColumnsDialogClusterFrameChildComponentInjectable;
