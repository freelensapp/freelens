/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { sendMessageToChannelInjectionToken } from "@freelensapp/messaging";
import { getInjectable } from "@ogre-tools/injectable";
import { aiChatStreamChannel } from "../common/channels";

import type { AiChatStreamEvent } from "../common/types";

export type AiChatStreamSender = (event: AiChatStreamEvent) => void;

const aiChatStreamSenderInjectable = getInjectable({
  id: "ai-chat-stream-sender",

  instantiate: (di): AiChatStreamSender => {
    const sendMessageToChannel = di.inject(sendMessageToChannelInjectionToken);

    return (event: AiChatStreamEvent) => {
      sendMessageToChannel(aiChatStreamChannel, event);
    };
  },
});

export default aiChatStreamSenderInjectable;
