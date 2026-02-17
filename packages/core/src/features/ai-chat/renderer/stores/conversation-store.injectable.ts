/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { action, computed, makeObservable, observable } from "mobx";

import type { AiProviderId, AiToolCall, AiToolResult } from "../../common/types";

export interface TokenUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  costUsd?: number;
}

export interface ConversationMessage {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  reasoning: string;
  timestamp: Date;
  toolCalls?: AiToolCall[];
  toolResults?: AiToolResult[];
  isError: boolean;
  usage?: TokenUsage;
  pendingConfirmation?: {
    toolCallId: string;
    toolName: string;
    description: string;
  };
}

let messageIdCounter = 0;

function nextMessageId(): string {
  return `msg-${++messageIdCounter}-${Date.now()}`;
}

export class ConversationStore {
  @observable conversationId = "";
  @observable clusterId = "";
  @observable clusterName = "";
  @observable providerId: AiProviderId = "anthropic";
  @observable messages: ConversationMessage[] = [];
  @observable isStreaming = false;
  @observable isDrawerOpen = false;

  constructor() {
    makeObservable(this);
  }

  @computed get hasMessages(): boolean {
    return this.messages.length > 0;
  }

  @computed get lastAssistantMessage(): ConversationMessage | undefined {
    for (let i = this.messages.length - 1; i >= 0; i--) {
      if (this.messages[i].role === "assistant") {
        return this.messages[i];
      }
    }

    return undefined;
  }

  @action
  addUserMessage(content: string): void {
    this.messages.push({
      id: nextMessageId(),
      role: "user",
      content,
      reasoning: "",
      timestamp: new Date(),
      isError: false,
    });
  }

  @action
  startAssistantMessage(): string {
    const id = nextMessageId();

    this.messages.push({
      id,
      role: "assistant",
      content: "",
      reasoning: "",
      timestamp: new Date(),
      isError: false,
    });
    this.isStreaming = true;

    return id;
  }

  /**
   * Get the current assistant message to append to.
   *
   * In multi-step tool flows, the stream looks like:
   *   text → tool-call → tool-result → text → tool-call → tool-result → text
   *
   * Each step after tool results must go into a NEW assistant message so that
   * the conversation history has properly alternating assistant/tool messages.
   *
   * If the last message is an assistant message, return it.
   * If the last message is a tool message (results just came in), create a new assistant message.
   */
  private getOrCreateCurrentAssistantMessage(): ConversationMessage {
    const last = this.messages[this.messages.length - 1];

    if (last && last.role === "assistant") {
      return last;
    }

    // Last message is a tool result (or user) — start a new assistant message for the next step
    const msg: ConversationMessage = {
      id: nextMessageId(),
      role: "assistant",
      content: "",
      reasoning: "",
      timestamp: new Date(),
      isError: false,
    };

    this.messages.push(msg);

    return msg;
  }

  @action
  appendTextDelta(text: string): void {
    const msg = this.getOrCreateCurrentAssistantMessage();

    msg.content += text;
  }

  @action
  appendReasoningDelta(text: string): void {
    const msg = this.getOrCreateCurrentAssistantMessage();

    msg.reasoning += text;
  }

  @action
  addToolCall(toolCall: AiToolCall): void {
    const msg = this.getOrCreateCurrentAssistantMessage();

    if (!msg.toolCalls) {
      msg.toolCalls = [];
    }

    if (msg.toolCalls.some((existing) => existing.toolCallId === toolCall.toolCallId)) {
      return;
    }

    msg.toolCalls.push(toolCall);
  }

  @action
  addToolResult(toolResult: AiToolResult): void {
    const last = this.messages[this.messages.length - 1];

    if (last?.role === "tool" && last.toolResults?.some((existing) => existing.toolCallId === toolResult.toolCallId)) {
      return;
    }

    this.messages.push({
      id: nextMessageId(),
      role: "tool",
      content: typeof toolResult.result === "string" ? toolResult.result : JSON.stringify(toolResult.result, null, 2),
      reasoning: "",
      timestamp: new Date(),
      toolResults: [toolResult],
      isError: toolResult.isError,
    });
  }

  @action
  addConfirmationRequired(toolCallId: string, toolName: string, description: string): void {
    const last = this.messages[this.messages.length - 1];

    if (last && last.role === "assistant") {
      last.pendingConfirmation = { toolCallId, toolName, description };
    }
  }

  @action
  resolveConfirmation(toolCallId: string): void {
    for (const msg of this.messages) {
      if (msg.pendingConfirmation?.toolCallId === toolCallId) {
        msg.pendingConfirmation = undefined;
      }
    }
  }

  @action
  finishStreaming(usage?: TokenUsage): void {
    if (usage) {
      // Attach usage to the last assistant message (may not be the absolute last due to tool messages)
      for (let i = this.messages.length - 1; i >= 0; i--) {
        if (this.messages[i].role === "assistant") {
          this.messages[i].usage = usage;
          break;
        }
      }
    }

    this.isStreaming = false;
  }

  @action
  addErrorMessage(message: string): void {
    this.messages.push({
      id: nextMessageId(),
      role: "assistant",
      content: message,
      reasoning: "",
      timestamp: new Date(),
      isError: true,
    });
    this.isStreaming = false;
  }

  @action
  clear(): void {
    this.messages = [];
    this.conversationId = "";
    this.isStreaming = false;
  }

  @action
  setCluster(clusterId: string, clusterName: string): void {
    if (this.clusterId !== clusterId) {
      this.clear();
      this.clusterId = clusterId;
      this.clusterName = clusterName;
    }
  }

  @action
  setProvider(providerId: AiProviderId): void {
    this.providerId = providerId;
  }

  @action
  setDrawerOpen(open: boolean): void {
    this.isDrawerOpen = open;
  }

  @action
  toggleDrawer(): void {
    this.isDrawerOpen = !this.isDrawerOpen;
  }

  @action
  newConversationId(): string {
    this.conversationId = `conv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    return this.conversationId;
  }
}

const conversationStoreInjectable = getInjectable({
  id: "ai-chat-conversation-store",
  instantiate: () => new ConversationStore(),
});

export default conversationStoreInjectable;
