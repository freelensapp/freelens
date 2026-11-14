/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getMessageChannelListenerInjectable } from "@freelensapp/messaging";
import { askAiInClusterFrameChannel } from "../common/ai-tools";
import askAiDialogStateInjectable from "./ask-ai-dialog-state.injectable";

const askAiInClusterFrameListenerInjectable = getMessageChannelListenerInjectable({
  id: "ask-ai-in-cluster-frame",
  channel: askAiInClusterFrameChannel,
  getHandler: (di) => {
    const dialogState = di.inject(askAiDialogStateInjectable);

    return (request) => dialogState.set(request);
  },
});

export default askAiInClusterFrameListenerInjectable;
