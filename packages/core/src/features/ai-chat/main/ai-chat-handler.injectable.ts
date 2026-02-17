/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { logErrorInjectionToken } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import type { AssistantModelMessage, ModelMessage, ToolModelMessage, UserModelMessage } from "ai";
import { stepCountIs, streamText } from "ai";

import executeOnClusterHandlerInjectable from "../../cluster/execute/main/execute-handler.injectable";
import getClusterByIdInjectable from "../../cluster/storage/common/get-by-id.injectable";
import userPreferencesStateInjectable from "../../user-preferences/common/state.injectable";
import type { AiChatMessage, AiChatRequest, AiChatRequestAck } from "../common/types";
import aiChatStreamSenderInjectable from "./ai-chat-stream-sender.injectable";
import aiProviderFactoryInjectable from "./ai-provider-factory.injectable";
import { createChatTools } from "./tools/create-chat-tools";

/**
 * Active streams tracked by conversationId for cancellation support.
 */
const activeStreams = new Map<string, AbortController>();

export type AiChatHandler = (request: AiChatRequest) => Promise<AiChatRequestAck>;

/**
 * Rough token budget for context window management.
 * We keep the most recent messages and trim older ones to stay within budget.
 * Using conservative estimates: ~4 chars per token.
 */
const MAX_CONTEXT_MESSAGES = 50;
const MAX_RECENT_MESSAGES_TO_KEEP = 20;

/**
 * Truncate conversation history to fit within context budget.
 * Preserves the first user message (for context) and the most recent N messages.
 */
function truncateMessages(messages: AiChatMessage[]): AiChatMessage[] {
  if (messages.length <= MAX_CONTEXT_MESSAGES) {
    return messages;
  }

  const first = messages[0];
  const recent = messages.slice(-MAX_RECENT_MESSAGES_TO_KEEP);

  if (recent[0] === first) {
    return recent;
  }

  return [first, ...recent];
}

const SYSTEM_PROMPT = `You are an AI assistant integrated into Freelens, a Kubernetes cluster management application.
You have access to the currently selected Kubernetes cluster and can query its state using the tools provided.

IMPORTANT RULES:
- ALWAYS use the provided tools to fetch data. NEVER fabricate or guess resource counts, names, or statuses.
- If a tool call fails, report the error to the user clearly.
- Format responses in Markdown for readability.
- For Secrets, you can only see metadata (name, namespace, keys) — never the actual secret values.
- If the user asks about something you cannot determine from the available tools, say so honestly.
- Be concise but thorough. Users are Kubernetes professionals who value accurate data.

FORMATTING RULES:
- Use **bold** for emphasis on key values (counts, names, statuses).
- Use tables for structured data, but limit tables to 15 rows maximum. If there are more items, show the first 15 and add a summary line like "... and 29 more".
- Use bullet lists for short enumerations (under 8 items).
- Use headings (### level) sparingly to separate distinct sections in longer responses.
- Use inline \`code\` for resource names, namespaces, and technical identifiers.
- Keep responses compact — avoid repeating information the user already knows.
- Do not use emojis.`;

const aiChatHandlerInjectable = getInjectable({
  id: "ai-chat-handler",

  instantiate: (di): AiChatHandler => {
    const providerFactory = di.inject(aiProviderFactoryInjectable);
    const streamSender = di.inject(aiChatStreamSenderInjectable);
    const getClusterById = di.inject(getClusterByIdInjectable);
    const logError = di.inject(logErrorInjectionToken);
    const userPreferencesState = di.inject(userPreferencesStateInjectable);
    const executeOnCluster = di.inject(executeOnClusterHandlerInjectable);

    return async (request: AiChatRequest): Promise<AiChatRequestAck> => {
      const { conversationId, clusterId, providerId, messages } = request;

      if (!providerFactory.hasApiKey(providerId)) {
        return {
          accepted: false,
          error: `No API key configured for ${providerId}. Please configure it in Preferences → AI Assistant.`,
        };
      }

      const cluster = getClusterById(clusterId);

      if (!cluster) {
        return {
          accepted: false,
          error: "Cluster not found. Please select a connected cluster.",
        };
      }

      if (!cluster.accessible.get()) {
        return {
          accepted: false,
          error: "Cluster is not accessible. Please ensure it is connected.",
        };
      }

      const clusterName = cluster.contextName.get();

      const abortController = new AbortController();

      activeStreams.set(conversationId, abortController);

      // Start streaming in background — return ack immediately
      void (async () => {
        try {
          const model = providerFactory.createModel(providerId);
          const tools = createChatTools({ clusterId, clusterName, executeOnCluster });

          const systemPrompt = `${SYSTEM_PROMPT}\n\nYou are connected to the cluster "${clusterName}".`;

          const truncatedMessages = truncateMessages(messages);
          const sdkMessages = convertToSdkMessages(truncatedMessages);

          const useThinking = providerId === "anthropic" && userPreferencesState.aiProviderThinkingEnabled;

          const result = streamText({
            model,
            system: systemPrompt,
            messages: sdkMessages,
            tools,
            stopWhen: stepCountIs(5),
            abortSignal: abortController.signal,
            ...(useThinking && {
              providerOptions: {
                anthropic: {
                  thinking: {
                    type: "enabled",
                    budgetTokens: userPreferencesState.aiProviderThinkingBudget || 10000,
                  },
                },
              },
            }),
          });

          for await (const chunk of result.fullStream) {
            if (abortController.signal.aborted) {
              break;
            }

            switch (chunk.type) {
              case "text-delta":
                streamSender({ type: "text-delta", conversationId, text: chunk.text });
                break;

              case "reasoning-delta":
                streamSender({ type: "reasoning-delta", conversationId, text: chunk.text });
                break;

              case "reasoning-start":
              case "reasoning-end":
                break;

              case "tool-call":
                streamSender({
                  type: "tool-call",
                  conversationId,
                  toolCallId: chunk.toolCallId,
                  toolName: chunk.toolName,
                  input: JSON.parse(JSON.stringify(chunk.input)),
                });
                break;

              case "tool-result":
                streamSender({
                  type: "tool-result",
                  conversationId,
                  toolCallId: chunk.toolCallId,
                  result: JSON.parse(JSON.stringify(chunk.output)),
                  isError: false,
                });
                break;

              case "error":
                streamSender({
                  type: "error",
                  conversationId,
                  message: String(chunk.error),
                });
                break;

              case "finish":
                break;
            }
          }

          const [finishReason, usage] = await Promise.all([
            result.finishReason,
            result.usage,
          ]);

          const inputTokens = usage?.inputTokens ?? 0;
          const outputTokens = usage?.outputTokens ?? 0;
          const modelId = providerId === "anthropic"
            ? (userPreferencesState.aiProviderModelAnthropic || "claude-sonnet-4-20250514")
            : (userPreferencesState.aiProviderModelOpenai || "gpt-4o");

          streamSender({
            type: "finish",
            conversationId,
            finishReason: finishReason ?? "stop",
            usage: {
              inputTokens: usage?.inputTokens,
              outputTokens: usage?.outputTokens,
              totalTokens: inputTokens + outputTokens,
              costUsd: estimateCostUsd(modelId, inputTokens, outputTokens),
            },
          });
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);

          let userMessage = errorMessage;

          if (errorMessage.includes("401") || errorMessage.includes("invalid_api_key") || errorMessage.includes("Unauthorized")) {
            userMessage = `Invalid API key for ${providerId}. Please check your API key in Preferences → AI Assistant.`;
          } else if (errorMessage.includes("429") || errorMessage.includes("rate_limit")) {
            userMessage = `Rate limit exceeded for ${providerId}. Please wait a moment and try again.`;
          } else if (errorMessage.includes("abort") || errorMessage.includes("cancel")) {
            streamSender({
              type: "finish",
              conversationId,
              finishReason: "cancelled",
              usage: {},
            });

            return;
          } else if (errorMessage.includes("ENOTFOUND") || errorMessage.includes("ECONNREFUSED")) {
            userMessage = `Unable to reach ${providerId} API. Please check your network connection.`;
          } else if (errorMessage.includes("403") || errorMessage.includes("Forbidden")) {
            userMessage = `Permission denied. You may not have access to the requested resources.`;
          }

          logError(`[ai-chat] Error in conversation ${conversationId}: ${errorMessage}`);
          streamSender({ type: "error", conversationId, message: userMessage });
        } finally {
          activeStreams.delete(conversationId);
        }
      })();

      return { accepted: true };
    };
  },
});

export default aiChatHandlerInjectable;

/**
 * Cancel an active stream by conversationId.
 */
export function cancelStream(conversationId: string): boolean {
  const controller = activeStreams.get(conversationId);

  if (controller) {
    controller.abort();
    activeStreams.delete(conversationId);

    return true;
  }

  return false;
}

/**
 * Per-million-token pricing by model prefix. Rates in USD.
 * Update when providers change pricing.
 */
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  // Anthropic
  "claude-opus-4-6":   { input: 5,  output: 25 },
  "claude-sonnet-4-5": { input: 3,   output: 15 },
  "claude-haiku-4-5":  { input: 1, output: 5 },
  // OpenAI
  "gpt-4o-mini":     { input: 0.15, output: 0.6 },
  "gpt-4o":          { input: 2.5,  output: 10 },
  "gpt-4-turbo":     { input: 10,   output: 30 },
};

function estimateCostUsd(modelId: string, inputTokens: number, outputTokens: number): number | undefined {
  const keys = Object.keys(MODEL_PRICING).sort((a, b) => b.length - a.length);
  const match = keys.find((prefix) => modelId.includes(prefix));

  if (!match) return undefined;

  const rates = MODEL_PRICING[match];

  return (inputTokens * rates.input + outputTokens * rates.output) / 1_000_000;
}

/**
 * Convert our flat AiChatMessage[] into the ai-sdk ModelMessage format.
 *
 * The Anthropic API requires:
 * - Assistant messages with tool calls use content arrays with tool-call parts
 * - Tool result messages use role: "tool" with tool-result content arrays
 * - Text content blocks must be non-empty
 */
function convertToSdkMessages(messages: AiChatMessage[]): ModelMessage[] {
  const result: ModelMessage[] = [];

  for (const msg of messages) {
    if (msg.role === "user") {
      if (msg.content) {
        result.push({ role: "user", content: msg.content } satisfies UserModelMessage);
      }
    } else if (msg.role === "assistant") {
      const hasToolCalls = msg.toolCalls && msg.toolCalls.length > 0;

      if (hasToolCalls) {
        const contentParts: AssistantModelMessage["content"] = [];

        if (msg.content) {
          contentParts.push({ type: "text" as const, text: msg.content });
        }

        for (const tc of msg.toolCalls!) {
          contentParts.push({
            type: "tool-call" as const,
            toolCallId: tc.toolCallId,
            toolName: tc.toolName,
            input: tc.input,
          });
        }

        result.push({ role: "assistant", content: contentParts } satisfies AssistantModelMessage);
      } else if (msg.content) {
        result.push({ role: "assistant", content: msg.content } satisfies AssistantModelMessage);
      }
    } else if (msg.role === "tool") {
      if (msg.toolResults && msg.toolResults.length > 0) {
        const toolResultParts = msg.toolResults.map((tr) => ({
          type: "tool-result" as const,
          toolCallId: tr.toolCallId,
          toolName: tr.toolName,
          output: { type: "json" as const, value: tr.result },
        }));

        result.push({ role: "tool", content: toolResultParts } as ToolModelMessage);
      }
    }
  }

  return result;
}
