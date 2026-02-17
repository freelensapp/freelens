/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./chat-drawer.scss";

import { requestFromChannelInjectionToken, sendMessageToChannelInjectionToken } from "@freelensapp/messaging";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React from "react";
import hostedClusterInjectable from "../../../../renderer/cluster-frame-context/hosted-cluster.injectable";
import { Drawer } from "../../../../renderer/components/drawer/drawer";
import userPreferencesStateInjectable from "../../../user-preferences/common/state.injectable";
import { aiChatCancelChannel, aiChatSendMessageChannel } from "../../common/channels";
import { ChatInput } from "./chat-input";
import { ChatMessage } from "./chat-message";
import { ChatOnboarding } from "./chat-onboarding";
import { ProviderSelector } from "./provider-selector";
import conversationStoreInjectable from "../stores/conversation-store.injectable";

import type { Cluster } from "../../../../common/cluster/cluster";
import type { UserPreferencesState } from "../../../user-preferences/common/state.injectable";
import type { AiChatRequest, AiChatRequestAck, AiProviderId } from "../../common/types";
import type { ConversationStore } from "../stores/conversation-store.injectable";

type RequestFromChannel = <Request, Response>(channel: unknown, request: Request) => Promise<Response>;
type SendMessageToChannel = <Message>(channel: unknown, message: Message) => void;

interface Dependencies {
  conversationStore: ConversationStore;
  hostedCluster: Cluster | undefined;
  userPreferences: UserPreferencesState;
  requestFromChannel: RequestFromChannel;
  sendMessageToChannel: SendMessageToChannel;
}

function hasProviderKey(userPreferences: UserPreferencesState, providerId: AiProviderId): boolean {
  if (providerId === "anthropic") {
    return Boolean(userPreferences.aiProviderApiKeyAnthropic);
  }

  return Boolean(userPreferences.aiProviderApiKeyOpenai);
}

function pickProvider(userPreferences: UserPreferencesState, preferred: AiProviderId): AiProviderId | undefined {
  if (hasProviderKey(userPreferences, preferred)) {
    return preferred;
  }

  if (hasProviderKey(userPreferences, "anthropic")) {
    return "anthropic";
  }

  if (hasProviderKey(userPreferences, "openai")) {
    return "openai";
  }

  return undefined;
}

const NonInjectedChatDrawer = observer(({
  conversationStore,
  hostedCluster,
  userPreferences,
  requestFromChannel,
  sendMessageToChannel,
}: Dependencies) => {
  const messagesRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!hostedCluster) {
      return;
    }

    conversationStore.setCluster(hostedCluster.id, hostedCluster.name.get());
  }, [conversationStore, hostedCluster]);

  React.useEffect(() => {
    const preferred = userPreferences.aiProviderActiveProvider as AiProviderId;
    const selected = pickProvider(userPreferences, preferred) ?? "anthropic";

    conversationStore.setProvider(selected);
  }, [conversationStore, userPreferences.aiProviderActiveProvider, userPreferences.aiProviderApiKeyAnthropic, userPreferences.aiProviderApiKeyOpenai]);

  React.useEffect(() => {
    const elem = messagesRef.current;

    if (!elem) {
      return;
    }

    elem.scrollTop = elem.scrollHeight;
  }, [conversationStore.messages.length, conversationStore.isStreaming]);

  const selectedProvider = conversationStore.providerId;
  const selectedProviderHasKey = hasProviderKey(userPreferences, selectedProvider);
  const toolResults = conversationStore.messages.flatMap((message) => message.toolResults ?? []);
  const lastAssistantMessage = conversationStore.lastAssistantMessage;
  const visibleMessages = conversationStore.messages.filter((message) => {
    console.log("message", JSON.stringify(message));
    if (message.role === "tool") {
      return false;
    }

    if (message.role === "user") {
      return true;
    }

    const hasRenderableAssistantState = Boolean(
      message.content.trim()
      || message.reasoning.trim()
      || message.isError
      || message.pendingConfirmation
      || message.toolCalls?.length,
    );
    const isCurrentStreamingAssistant = conversationStore.isStreaming && message.id === lastAssistantMessage?.id;

    return hasRenderableAssistantState || isCurrentStreamingAssistant;
  });

  const sendMessage = React.useCallback(async (message: string) => {
    if (!hostedCluster) {
      conversationStore.addErrorMessage("Cluster context is not available.");
      return;
    }

    const providerId = pickProvider(userPreferences, conversationStore.providerId);

    if (!providerId) {
      conversationStore.addErrorMessage("No AI provider API key configured. Open AI Assistant preferences to continue.");
      return;
    }

    if (!conversationStore.conversationId) {
      conversationStore.newConversationId();
    }

    conversationStore.setProvider(providerId);
    conversationStore.addUserMessage(message);
    conversationStore.startAssistantMessage();

    const payload: AiChatRequest = {
      conversationId: conversationStore.conversationId,
      clusterId: hostedCluster.id,
      providerId,
      userMessage: message,
    };
    const ack = await requestFromChannel<AiChatRequest, AiChatRequestAck>(aiChatSendMessageChannel, payload);

    if (!ack.accepted) {
      conversationStore.addErrorMessage(ack.error ?? "Failed to send message.");
    }
  }, [conversationStore, hostedCluster, requestFromChannel, userPreferences]);

  const cancelStreaming = React.useCallback(() => {
    if (!conversationStore.conversationId || !conversationStore.isStreaming) {
      return;
    }

    sendMessageToChannel(aiChatCancelChannel, { conversationId: conversationStore.conversationId });
    conversationStore.finishStreaming();
  }, [conversationStore, sendMessageToChannel]);

  return (
    <Drawer
      open={conversationStore.isDrawerOpen}
      title="AI Chat"
      position="right"
      animation="slide-right"
      className="AiChatDrawer"
      toolbar={<ProviderSelector />}
      onClose={() => conversationStore.setDrawerOpen(false)}
      data-testid="ai-chat-drawer"
      testIdForClose="ai-chat-drawer-close"
    >
      <div className="AiChatDrawer">
        <div className="AiChatDrawer__messages" ref={messagesRef}>
          {!selectedProviderHasKey ? (
            <ChatOnboarding providerId={selectedProvider} />
          ) : visibleMessages.length === 0 ? (
            <div className="empty flex column gaps align-center justify-center">
              <h3>Ask anything about this cluster</h3>
              <p>Try "show failed pods" or "summarize recent warning events".</p>
            </div>
          ) : (
            visibleMessages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                isStreaming={conversationStore.isStreaming && message.id === lastAssistantMessage?.id}
                toolResults={toolResults}
              />
            ))
          )}
        </div>

        <ChatInput
          onSend={(message) => {
            void sendMessage(message);
          }}
          onCancel={cancelStreaming}
          isStreaming={conversationStore.isStreaming}
          disabled={!hostedCluster || !selectedProviderHasKey}
        />
      </div>
    </Drawer>
  );
});

export const ChatDrawer = withInjectables<Dependencies>(NonInjectedChatDrawer, {
  getProps: (di) => ({
    conversationStore: di.inject(conversationStoreInjectable),
    hostedCluster: di.inject(hostedClusterInjectable),
    userPreferences: di.inject(userPreferencesStateInjectable),
    requestFromChannel: di.inject(requestFromChannelInjectionToken) as RequestFromChannel,
    sendMessageToChannel: di.inject(sendMessageToChannelInjectionToken) as SendMessageToChannel,
  }),
});
