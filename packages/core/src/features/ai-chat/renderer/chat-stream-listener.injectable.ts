/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getMessageChannelListenerInjectable } from "@freelensapp/messaging";
import { aiChatStreamChannel } from "../common/channels";
import conversationStoreInjectable from "./stores/conversation-store.injectable";

import type { AiChatStreamEvent } from "../common/types";

const chatStreamListenerInjectable = getMessageChannelListenerInjectable({
  id: "ai-chat-stream-listener",
  channel: aiChatStreamChannel,

  getHandler: (di) => {
    const conversationStore = di.inject(conversationStoreInjectable);

    return (event: AiChatStreamEvent) => {
      // Only handle events for the active conversation
      if (event.conversationId !== conversationStore.conversationId) {
        return;
      }

      switch (event.type) {
        case "text-delta":
          conversationStore.appendTextDelta(event.text);
          break;

        case "reasoning-delta":
          conversationStore.appendReasoningDelta(event.text);
          break;

        case "tool-call":
          conversationStore.addToolCall({
            toolCallId: event.toolCallId,
            toolName: event.toolName,
            input: event.input,
          });
          break;

        case "tool-result":
          conversationStore.addToolResult({
            toolCallId: event.toolCallId,
            toolName: "",
            result: event.result,
            isError: event.isError,
          });
          break;

        case "confirmation-required":
          conversationStore.addConfirmationRequired(event.toolCallId, event.toolName, event.description);
          break;

        case "finish":
          conversationStore.finishStreaming(event.usage);
          break;

        case "error":
          conversationStore.addErrorMessage(event.message);
          break;
      }
    };
  },
});

export default chatStreamListenerInjectable;
