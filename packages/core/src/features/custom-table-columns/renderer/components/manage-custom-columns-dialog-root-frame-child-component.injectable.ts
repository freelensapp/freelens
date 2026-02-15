/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { rootFrameChildComponentInjectionToken } from "@freelensapp/react-application";
import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import { ManageCustomColumnsDialog } from "./manage-custom-columns-dialog";

const manageCustomColumnsDialogRootFrameChildComponentInjectable = getInjectable({
  id: "manage-custom-columns-dialog-root-frame-child-component",

  instantiate: () => ({
    id: "manage-custom-columns-dialog",
    shouldRender: computed(() => true),
    Component: ManageCustomColumnsDialog,
  }),

  injectionToken: rootFrameChildComponentInjectionToken,
});

export default manageCustomColumnsDialogRootFrameChildComponentInjectable;
