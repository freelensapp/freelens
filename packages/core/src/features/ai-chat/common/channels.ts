/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getMessageChannel, getRequestChannel } from "@freelensapp/messaging";

import type {
  AiChatCancelRequest,
  AiChatConfirmAction,
  AiChatConfirmActionResult,
  AiChatRequest,
  AiChatRequestAck,
  AiChatStreamEvent,
} from "./types";

/**
 * RequestChannel: Renderer → Main. Sends a chat message and receives an ack.
 */
export const aiChatSendMessageChannel = getRequestChannel<AiChatRequest, AiChatRequestAck>("ai-chat-send-message");

/**
 * MessageChannel: Main → Renderer. Streams token deltas, tool calls, and status events.
 */
export const aiChatStreamChannel = getMessageChannel<AiChatStreamEvent>("ai-chat-stream");

/**
 * MessageChannel: Renderer → Main. Cancels an active stream.
 */
export const aiChatCancelChannel = getMessageChannel<AiChatCancelRequest>("ai-chat-cancel");

/**
 * RequestChannel: Renderer → Main. Confirms or declines a mutating action.
 */
export const aiChatConfirmActionChannel = getRequestChannel<AiChatConfirmAction, AiChatConfirmActionResult>(
  "ai-chat-confirm-action",
);
