/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import { stepCountIs, streamText } from "ai";
import executeOnClusterHandlerInjectable from "../../cluster/execute/main/execute-handler.injectable";
import getClusterByIdInjectable from "../../cluster/storage/common/get-by-id.injectable";
import userPreferencesStateInjectable from "../../user-preferences/common/state.injectable";
import aiChatStreamSenderInjectable from "./ai-chat-stream-sender.injectable";
import aiProviderFactoryInjectable from "./ai-provider-factory.injectable";
import { createChatTools } from "./tools/create-chat-tools";

import type { AiChatRequest, AiChatRequestAck } from "../common/types";

type ConversationTurn = {
  role: "user" | "assistant";
  content: string;
};

type StreamChunk = {
  type?: unknown;
  [key: string]: unknown;
};

const activeStreamsByConversationId = new Map<string, AbortController>();
const conversationHistoryById = new Map<string, ConversationTurn[]>();

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Failed to process AI response.";
}

function getConversationHistory(conversationId: string): ConversationTurn[] {
  const existing = conversationHistoryById.get(conversationId);

  if (existing) {
    return existing;
  }

  const created: ConversationTurn[] = [];

  conversationHistoryById.set(conversationId, created);

  return created;
}

function trimConversation(history: ConversationTurn[], maxTurns = 20): void {
  if (history.length <= maxTurns) {
    return;
  }

  history.splice(0, history.length - maxTurns);
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0
    ? value
    : undefined;
}

function pickChunkText(chunk: StreamChunk): string | undefined {
  return readString(chunk.text) ?? readString(chunk.textDelta);
}

function pickToolResult(chunk: StreamChunk): unknown {
  if (typeof chunk.output !== "undefined") {
    return chunk.output;
  }

  return chunk.result;
}

function buildSystemPrompt(clusterName: string): string {
  return [
    "You are the Freelens AI assistant for Kubernetes troubleshooting and operations.",
    `Current cluster: ${clusterName}.`,
    "Use available tools whenever the user asks for cluster data or object details.",
    "Never invent Kubernetes state. If tool output is missing, say what is missing.",
    "Respond in concise markdown with actionable next steps.",
  ].join("\n");
}

/**
 * Per-million-token pricing by model prefix. Rates in USD.
 */
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "claude-opus-4-6":   { input: 5,  output: 25 },
  "claude-sonnet-4-5": { input: 3,  output: 15 },
  "claude-haiku-4-5":  { input: 1,  output: 5 },
  "gpt-4o-mini":       { input: 0.15, output: 0.6 },
  "gpt-4o":            { input: 2.5,  output: 10 },
  "gpt-4-turbo":       { input: 10,   output: 30 },
};

function estimateCostUsd(modelId: string, inputTokens: number, outputTokens: number): number | undefined {
  const keys = Object.keys(MODEL_PRICING).sort((a, b) => b.length - a.length);
  const match = keys.find((prefix) => modelId.includes(prefix));

  if (!match) return undefined;

  const rates = MODEL_PRICING[match];

  return (inputTokens * rates.input + outputTokens * rates.output) / 1_000_000;
}

export function cancelStream(conversationId: string): boolean {
  const active = activeStreamsByConversationId.get(conversationId);

  if (!active) {
    return false;
  }

  active.abort();
  activeStreamsByConversationId.delete(conversationId);

  return true;
}

const aiChatHandlerInjectable = getInjectable({
  id: "ai-chat-handler",

  instantiate: (di) => {
    const logger = di.inject(loggerInjectionToken);
    const aiProviderFactory = di.inject(aiProviderFactoryInjectable);
    const sendStreamEvent = di.inject(aiChatStreamSenderInjectable);
    const executeOnCluster = di.inject(executeOnClusterHandlerInjectable);
    const getClusterById = di.inject(getClusterByIdInjectable);
    const userPreferences = di.inject(userPreferencesStateInjectable);

    return async (request: AiChatRequest): Promise<AiChatRequestAck> => {
      const { conversationId, clusterId, providerId, userMessage } = request;

      if (!conversationId || !clusterId || !userMessage.trim()) {
        return {
          accepted: false,
          error: "Invalid chat request payload.",
        };
      }

      const cluster = getClusterById(clusterId);

      if (!cluster) {
        return {
          accepted: false,
          error: "Cluster not found.",
        };
      }

      if (!aiProviderFactory.hasApiKey(providerId)) {
        return {
          accepted: false,
          error: `No API key configured for ${providerId}.`,
        };
      }

      const currentlyActive = activeStreamsByConversationId.get(conversationId);

      if (currentlyActive) {
        currentlyActive.abort();
        activeStreamsByConversationId.delete(conversationId);
      }

      const controller = new AbortController();

      activeStreamsByConversationId.set(conversationId, controller);

      const history = getConversationHistory(conversationId);

      history.push({
        role: "user",
        content: userMessage,
      });

      trimConversation(history);

      const clusterName = cluster.name.get();

      void (async () => {
        let assistantResponse = "";

        try {
          const model = aiProviderFactory.createModel(providerId);
          const tools = createChatTools({
            clusterId,
            clusterName,
            executeOnCluster,
          });
          const useThinking = providerId === "anthropic" && userPreferences.aiProviderThinkingEnabled;

          const streamResult = streamText({
            model,
            system: buildSystemPrompt(clusterName),
            messages: history,
            tools,
            stopWhen: stepCountIs(5),
            abortSignal: controller.signal,
            ...(useThinking && {
              providerOptions: {
                anthropic: {
                  thinking: {
                    type: "enabled",
                    budgetTokens: userPreferences.aiProviderThinkingBudget || 1024,
                  },
                },
              },
            }),
          });

          for await (const chunk of streamResult.fullStream as AsyncIterable<StreamChunk>) {
            if (controller.signal.aborted) {
              break;
            }

            const eventType = readString(chunk.type);

            if (!eventType) {
              continue;
            }

            if (eventType === "text-delta") {
              const text = pickChunkText(chunk);

              if (!text) {
                continue;
              }

              assistantResponse += text;
              sendStreamEvent({ type: "text-delta", conversationId, text });
              continue;
            }

            if (eventType === "reasoning-delta") {
              const text = pickChunkText(chunk);

              if (text) {
                sendStreamEvent({ type: "reasoning-delta", conversationId, text });
              }
              continue;
            }

            if (eventType === "tool-call") {
              const toolCallId = readString(chunk.toolCallId);
              const toolName = readString(chunk.toolName);

              if (toolCallId && toolName) {
                sendStreamEvent({
                  type: "tool-call",
                  conversationId,
                  toolCallId,
                  toolName,
                  input: chunk.input,
                });
              }
              continue;
            }

            if (eventType === "tool-result") {
              const toolCallId = readString(chunk.toolCallId);
              const toolName = readString(chunk.toolName) ?? "tool";

              if (toolCallId) {
                sendStreamEvent({
                  type: "tool-result",
                  conversationId,
                  toolCallId,
                  toolName,
                  result: pickToolResult(chunk),
                  isError: Boolean(chunk.isError),
                });
              }
            }
          }

          if (!assistantResponse.trim() && !controller.signal.aborted) {
            const textPromise = (streamResult as { text?: PromiseLike<string> }).text;
            const fallbackText = textPromise ? (await textPromise).trim() : "";

            if (fallbackText) {
              assistantResponse = fallbackText;
              sendStreamEvent({ type: "text-delta", conversationId, text: fallbackText });
            }
          }

          if (assistantResponse.trim()) {
            history.push({
              role: "assistant",
              content: assistantResponse,
            });
            trimConversation(history);
          }

          if (controller.signal.aborted) {
            sendStreamEvent({ type: "finish", conversationId, finishReason: "cancelled", usage: {} });
          } else {
            const usageData = await (streamResult as { usage?: PromiseLike<{ inputTokens?: number; outputTokens?: number }> }).usage;
            const finishReason = await (streamResult as { finishReason?: PromiseLike<string> }).finishReason;
            const inputTokens = usageData?.inputTokens ?? 0;
            const outputTokens = usageData?.outputTokens ?? 0;

            const modelId = providerId === "anthropic"
              ? (userPreferences.aiProviderModelAnthropic || "claude-sonnet-4-5")
              : (userPreferences.aiProviderModelOpenai || "gpt-4o");

            sendStreamEvent({
              type: "finish",
              conversationId,
              finishReason: finishReason ?? "stop",
              usage: {
                inputTokens: inputTokens || undefined,
                outputTokens: outputTokens || undefined,
                totalTokens: (inputTokens + outputTokens) || undefined,
                costUsd: estimateCostUsd(modelId, inputTokens, outputTokens),
              },
            });
          }
        } catch (error) {
          if (controller.signal.aborted) {
            sendStreamEvent({ type: "finish", conversationId, finishReason: "cancelled", usage: {} });
          } else {
            const message = toErrorMessage(error);

            logger.error(`[ai-chat] stream failed for ${conversationId}: ${message}`);
            sendStreamEvent({
              type: "error",
              conversationId,
              message,
            });
          }
        } finally {
          activeStreamsByConversationId.delete(conversationId);
        }
      })();

      return {
        accepted: true,
      };
    };
  },
});

export default aiChatHandlerInjectable;
