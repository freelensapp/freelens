/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { rootFrameChildComponentInjectionToken } from "@freelensapp/react-application";
import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import { AiApprovalDialog } from "./ai-approval-dialog";

const aiApprovalDialogRootFrameChildComponentInjectable = getInjectable({
  id: "ai-approval-dialog-root-frame-child-component",
  instantiate: () => ({
    id: "ai-approval-dialog",
    shouldRender: computed(() => true),
    Component: AiApprovalDialog,
  }),
  injectionToken: rootFrameChildComponentInjectionToken,
});

export default aiApprovalDialogRootFrameChildComponentInjectable;
