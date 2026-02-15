/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getMessageChannelListenerInjectable } from "@freelensapp/messaging";
import { loggerInjectionToken } from "@freelensapp/logger";
import { cancelStream } from "../ai-chat-handler.injectable";
import { aiChatCancelChannel } from "../../common/channels";

const cancelStreamListenerInjectable = getMessageChannelListenerInjectable({
  id: "ai-chat-cancel-stream-listener",
  channel: aiChatCancelChannel,
  getHandler: (di) => {
    const logger = di.inject(loggerInjectionToken);

    return (message) => {
      const cancelled = cancelStream(message.conversationId);

      logger.info(`[ai-chat] Cancel request for ${message.conversationId}: ${cancelled ? "cancelled" : "not found"}`);
    };
  },
});

export default cancelStreamListenerInjectable;
