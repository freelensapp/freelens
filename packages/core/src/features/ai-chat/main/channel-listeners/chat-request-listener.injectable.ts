/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getRequestChannelListenerInjectable } from "@freelensapp/messaging";
import aiChatHandlerInjectable from "../ai-chat-handler.injectable";
import { aiChatSendMessageChannel } from "../../common/channels";

const chatRequestListenerInjectable = getRequestChannelListenerInjectable({
  id: "ai-chat-request-listener",
  channel: aiChatSendMessageChannel,
  getHandler: (di) => {
    const handler = di.inject(aiChatHandlerInjectable);

    return (request) => handler(request);
  },
});

export default chatRequestListenerInjectable;
