/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { action, computed, makeObservable, observable } from "mobx";

import type { AiChatMessage, AiProviderId, AiToolCall, AiToolResult } from "../../common/types";

export interface ConversationMessage {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  timestamp: Date;
  toolCalls?: AiToolCall[];
  toolResults?: AiToolResult[];
  isError: boolean;
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

  /**
   * Convert conversation messages to the format expected by the IPC channel.
   */
  @computed get messagesForRequest(): AiChatMessage[] {
    return this.messages
      .filter((m) => !m.isError)
      .map((m) => ({
        role: m.role,
        content: m.content,
        toolCalls: m.toolCalls,
        toolResults: m.toolResults,
      }));
  }

  @action
  addUserMessage(content: string): void {
    this.messages.push({
      id: nextMessageId(),
      role: "user",
      content,
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
      timestamp: new Date(),
      isError: false,
    });
    this.isStreaming = true;

    return id;
  }

  @action
  appendTextDelta(text: string): void {
    const last = this.messages[this.messages.length - 1];

    if (last && last.role === "assistant") {
      last.content += text;
    } else {
      this.messages.push({
        id: nextMessageId(),
        role: "assistant",
        content: text,
        timestamp: new Date(),
        isError: false,
      });
    }
  }

  @action
  addToolCall(toolCall: AiToolCall): void {
    const last = this.messages[this.messages.length - 1];

    if (last && last.role === "assistant") {
      if (!last.toolCalls) {
        last.toolCalls = [];
      }
      last.toolCalls.push(toolCall);
    }
  }

  @action
  addToolResult(toolResult: AiToolResult): void {
    this.messages.push({
      id: nextMessageId(),
      role: "tool",
      content: typeof toolResult.result === "string" ? toolResult.result : JSON.stringify(toolResult.result, null, 2),
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
  finishStreaming(): void {
    this.isStreaming = false;
  }

  @action
  addErrorMessage(message: string): void {
    this.messages.push({
      id: nextMessageId(),
      role: "assistant",
      content: message,
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
