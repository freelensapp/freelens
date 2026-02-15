/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { stepCountIs, streamText, tool } from "ai";
import type { AssistantModelMessage, ModelMessage, ToolModelMessage, UserModelMessage } from "ai";
import { logErrorInjectionToken } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import executeOnClusterHandlerInjectable from "../../cluster/execute/main/execute-handler.injectable";
import getClusterByIdInjectable from "../../cluster/storage/common/get-by-id.injectable";
import aiProviderFactoryInjectable from "./ai-provider-factory.injectable";
import aiChatStreamSenderInjectable from "./ai-chat-stream-sender.injectable";
import getClusterInfoToolInjectable from "./tools/get-cluster-info.injectable";
import getEventsToolInjectable from "./tools/get-events.injectable";
import getResourceToolInjectable from "./tools/get-resource.injectable";
import listResourcesToolInjectable from "./tools/list-resources.injectable";

import type { AiChatMessage, AiChatRequest, AiChatRequestAck } from "../common/types";

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

  // Keep first message + most recent messages
  const first = messages[0];
  const recent = messages.slice(-MAX_RECENT_MESSAGES_TO_KEEP);

  // If the first message is already in the recent slice, just return recent
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

    // Get tool definitions — we'll wrap them to inject the clusterId
    const listResourcesTool = di.inject(listResourcesToolInjectable);
    const getResourceTool = di.inject(getResourceToolInjectable);
    const getClusterInfoTool = di.inject(getClusterInfoToolInjectable);
    const getEventsTool = di.inject(getEventsToolInjectable);
    const executeOnCluster = di.inject(executeOnClusterHandlerInjectable);

    return async (request: AiChatRequest): Promise<AiChatRequestAck> => {
      const { conversationId, clusterId, providerId, messages } = request;

      // Validate API key
      if (!providerFactory.hasApiKey(providerId)) {
        return {
          accepted: false,
          error: `No API key configured for ${providerId}. Please configure it in Preferences → AI Assistant.`,
        };
      }

      // Validate cluster
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

      // Create abort controller for cancellation
      const abortController = new AbortController();

      activeStreams.set(conversationId, abortController);

      // Start streaming in background — return ack immediately
      void (async () => {
        try {
          const model = providerFactory.createModel(providerId);

          // Create tools with clusterId bound — each tool wrapper builds
          // the correct request with the real clusterId from this conversation.
          const tools = {
            listResources: tool({
              description: listResourcesTool.description,
              inputSchema: listResourcesTool.parameters,
              execute: async (input: any) => {
                const resolvedApiVersion = input.apiVersion || resolveApiVersion(input.kind);
                const response = await executeOnCluster({
                  clusterId,
                  operation: "list",
                  resource: {
                    apiVersion: resolvedApiVersion,
                    kind: input.kind,
                    namespace: input.namespace,
                    labelSelector: input.labelSelector,
                  },
                });

                if (!response.success) {
                  return { error: response.error?.message ?? "Failed to list resources" };
                }

                const items = ((response.data as any)?.items as any[]) ?? [];

                return {
                  kind: input.kind,
                  namespace: input.namespace ?? "all namespaces",
                  count: items.length,
                  items: items.map((item: any) => ({
                    name: item?.metadata?.name,
                    namespace: item?.metadata?.namespace,
                    status: item?.status?.phase ?? item?.status?.conditions?.[0]?.type,
                    createdAt: item?.metadata?.creationTimestamp,
                    labels: item?.metadata?.labels,
                  })),
                };
              },
            }),

            getResource: tool({
              description: getResourceTool.description,
              inputSchema: getResourceTool.parameters,
              execute: async (input: any) => {
                const resolvedApiVersion = input.apiVersion || resolveApiVersion(input.kind);
                const response = await executeOnCluster({
                  clusterId,
                  operation: "get",
                  resource: {
                    apiVersion: resolvedApiVersion,
                    kind: input.kind,
                    name: input.name,
                    namespace: input.namespace,
                  },
                });

                if (!response.success) {
                  if (response.error?.code === 404) {
                    return {
                      error: `Resource ${input.kind}/${input.name} not found${input.namespace ? ` in namespace ${input.namespace}` : ""}`,
                    };
                  }

                  return { error: response.error?.message ?? "Failed to get resource" };
                }

                const resource = response.data as any;

                if (input.kind === "Secret") {
                  return {
                    kind: input.kind,
                    name: resource?.metadata?.name,
                    namespace: resource?.metadata?.namespace,
                    type: resource?.type,
                    labels: resource?.metadata?.labels,
                    dataKeys: resource?.data ? Object.keys(resource.data) : [],
                    note: "Secret values are redacted for security",
                  };
                }

                return resource;
              },
            }),

            getClusterInfo: tool({
              description: getClusterInfoTool.description,
              inputSchema: getClusterInfoTool.parameters,
              execute: async () => {
                const [nodesRes, nsRes] = await Promise.all([
                  executeOnCluster({
                    clusterId,
                    operation: "list",
                    resource: { apiVersion: "v1", kind: "Node" },
                  }),
                  executeOnCluster({
                    clusterId,
                    operation: "list",
                    resource: { apiVersion: "v1", kind: "Namespace" },
                  }),
                ]);

                const nodes = ((nodesRes.data as any)?.items as any[]) ?? [];
                const namespaces = ((nsRes.data as any)?.items as any[]) ?? [];

                return {
                  clusterName,
                  nodeCount: nodes.length,
                  nodes: nodes.map((n: any) => ({
                    name: n?.metadata?.name,
                    status:
                      n?.status?.conditions?.find((c: any) => c.type === "Ready")?.status === "True"
                        ? "Ready"
                        : "NotReady",
                    kubeletVersion: n?.status?.nodeInfo?.kubeletVersion,
                  })),
                  namespaceCount: namespaces.length,
                  namespaces: namespaces.map((ns: any) => ns?.metadata?.name),
                };
              },
            }),

            getEvents: tool({
              description: getEventsTool.description,
              inputSchema: getEventsTool.parameters,
              execute: async (input: any) => {
                const fieldSelectors: string[] = [];

                if (input.involvedObjectName) {
                  fieldSelectors.push(`involvedObject.name=${input.involvedObjectName}`);
                }

                if (input.involvedObjectKind) {
                  fieldSelectors.push(`involvedObject.kind=${input.involvedObjectKind}`);
                }

                const response = await executeOnCluster({
                  clusterId,
                  operation: "list",
                  resource: {
                    apiVersion: "v1",
                    kind: "Event",
                    namespace: input.namespace,
                    fieldSelector: fieldSelectors.length > 0 ? fieldSelectors.join(",") : undefined,
                  },
                });

                if (!response.success) {
                  return { error: response.error?.message ?? "Failed to get events" };
                }

                const events = ((response.data as any)?.items as any[]) ?? [];
                const sorted = events
                  .sort((a: any, b: any) => {
                    const tA = new Date(a?.lastTimestamp ?? a?.metadata?.creationTimestamp ?? 0).getTime();
                    const tB = new Date(b?.lastTimestamp ?? b?.metadata?.creationTimestamp ?? 0).getTime();

                    return tB - tA;
                  })
                  .slice(0, 50);

                return {
                  count: events.length,
                  events: sorted.map((e: any) => ({
                    type: e?.type,
                    reason: e?.reason,
                    message: e?.message,
                    involvedObject: `${e?.involvedObject?.kind}/${e?.involvedObject?.name}`,
                    count: e?.count,
                    lastTimestamp: e?.lastTimestamp,
                  })),
                };
              },
            }),
          };

          const systemPrompt = `${SYSTEM_PROMPT}\n\nYou are connected to the cluster "${clusterName}".`;

          // Truncate conversation history to stay within context budget
          const truncatedMessages = truncateMessages(messages);

          // Convert our flat message format into the ai-sdk CoreMessage format.
          // Assistant messages with tool calls need structured content parts,
          // and tool result messages need their own structured format.
          const sdkMessages = convertToSdkMessages(truncatedMessages);

          const result = streamText({
            model,
            system: systemPrompt,
            messages: sdkMessages,
            tools,
            stopWhen: stepCountIs(5),
            abortSignal: abortController.signal,
          });

          for await (const chunk of result.fullStream) {
            if (abortController.signal.aborted) {
              break;
            }

            switch (chunk.type) {
              case "text-delta":
                streamSender({ type: "text-delta", conversationId, text: chunk.text });
                break;

              case "tool-call":
                streamSender({
                  type: "tool-call",
                  conversationId,
                  toolCallId: chunk.toolCallId,
                  toolName: chunk.toolName,
                  input: chunk.input,
                });
                break;

              case "tool-result":
                streamSender({
                  type: "tool-result",
                  conversationId,
                  toolCallId: chunk.toolCallId,
                  result: chunk.output,
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
                // Will be sent after the loop
                break;
            }
          }

          const [finishReason, usage] = await Promise.all([
            result.finishReason,
            result.usage,
          ]);

          streamSender({
            type: "finish",
            conversationId,
            finishReason: finishReason ?? "stop",
            usage: {
              inputTokens: usage?.inputTokens,
              outputTokens: usage?.outputTokens,
              totalTokens: (usage?.inputTokens ?? 0) + (usage?.outputTokens ?? 0),
            },
          });
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);

          // Classify common errors
          let userMessage = errorMessage;

          if (errorMessage.includes("401") || errorMessage.includes("invalid_api_key") || errorMessage.includes("Unauthorized")) {
            userMessage = `Invalid API key for ${providerId}. Please check your API key in Preferences → AI Assistant.`;
          } else if (errorMessage.includes("429") || errorMessage.includes("rate_limit")) {
            userMessage = `Rate limit exceeded for ${providerId}. Please wait a moment and try again.`;
          } else if (errorMessage.includes("abort") || errorMessage.includes("cancel")) {
            // Don't send error for user-initiated cancellation
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

function resolveApiVersion(kind: string): string {
  const map: Record<string, string> = {
    Pod: "v1", Service: "v1", Node: "v1", Namespace: "v1",
    ConfigMap: "v1", Secret: "v1", Event: "v1",
    Deployment: "apps/v1", StatefulSet: "apps/v1", DaemonSet: "apps/v1", ReplicaSet: "apps/v1",
    Ingress: "networking.k8s.io/v1", Job: "batch/v1", CronJob: "batch/v1",
  };

  return map[kind] || "v1";
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
        // Build structured content array for assistant messages with tool calls
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
        // Simple text-only assistant message
        result.push({ role: "assistant", content: msg.content } satisfies AssistantModelMessage);
      }
      // Skip assistant messages with no content and no tool calls
    } else if (msg.role === "tool") {
      if (msg.toolResults && msg.toolResults.length > 0) {
        const toolResultParts = msg.toolResults.map((tr) => ({
          type: "tool-result" as const,
          toolCallId: tr.toolCallId,
          toolName: tr.toolName,
          output: { type: "json" as const, value: tr.result },
        }));

        // Cast needed because ToolResultOutput expects JSONValue, but our result is unknown
        result.push({ role: "tool", content: toolResultParts } as ToolModelMessage);
      }
    }
  }

  return result;
}
