/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

/**
 * Supported AI provider identifiers.
 */
export type AiProviderId = "anthropic" | "openai";

/**
 * Request payload sent from renderer to main to initiate a chat message.
 */
export interface AiChatRequest {
  conversationId: string;
  clusterId: string;
  providerId: AiProviderId;
  messages: AiChatMessage[];
}

/**
 * Acknowledgment returned by main after receiving a chat request.
 */
export interface AiChatRequestAck {
  accepted: boolean;
  error?: string;
}

/**
 * A single message in the conversation history sent to the AI.
 */
export interface AiChatMessage {
  role: "user" | "assistant" | "tool";
  content: string;
  toolCalls?: AiToolCall[];
  toolResults?: AiToolResult[];
}

/**
 * A tool call made by the AI assistant.
 */
export interface AiToolCall {
  toolCallId: string;
  toolName: string;
  input: unknown;
}

/**
 * The result of executing a tool call.
 */
export interface AiToolResult {
  toolCallId: string;
  toolName: string;
  result: unknown;
  isError: boolean;
}

/**
 * Discriminated union of all stream events sent from main to renderer.
 */
export type AiChatStreamEvent =
  | { type: "text-delta"; conversationId: string; text: string }
  | { type: "tool-call"; conversationId: string; toolCallId: string; toolName: string; input: unknown }
  | { type: "tool-result"; conversationId: string; toolCallId: string; result: unknown; isError: boolean }
  | {
      type: "confirmation-required";
      conversationId: string;
      toolCallId: string;
      toolName: string;
      description: string;
    }
  | {
      type: "finish";
      conversationId: string;
      finishReason: string;
      usage: { inputTokens?: number; outputTokens?: number; totalTokens?: number };
    }
  | { type: "error"; conversationId: string; message: string };

/**
 * Request sent from renderer to main to cancel an active stream.
 */
export interface AiChatCancelRequest {
  conversationId: string;
}

/**
 * Request sent from renderer to main to confirm or decline a mutating action.
 */
export interface AiChatConfirmAction {
  conversationId: string;
  toolCallId: string;
  confirmed: boolean;
}

/**
 * Response returned by main after processing a confirm action request.
 */
export interface AiChatConfirmActionResult {
  executed: boolean;
  error?: string;
}

/**
 * AI provider configuration stored in user preferences.
 */
export interface AiProviderConfig {
  apiKey: string;
  model: string;
}
