/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { clusterFrameChildComponentInjectionToken } from "@freelensapp/react-application";
import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import { AskAiDialog } from "./ask-ai-dialog";

const askAiDialogClusterFrameChildComponentInjectable = getInjectable({
  id: "ask-ai-dialog-cluster-frame-child-component",
  instantiate: () => ({
    id: "ask-ai-dialog",
    shouldRender: computed(() => true),
    Component: AskAiDialog,
  }),
  injectionToken: clusterFrameChildComponentInjectionToken,
});

export default askAiDialogClusterFrameChildComponentInjectable;
