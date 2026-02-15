/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./chat-drawer.scss";

import { requestFromChannelInjectionToken, sendMessageToChannelInjectionToken } from "@freelensapp/messaging";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React, { useCallback, useEffect, useRef } from "react";
import { Drawer } from "../../../../renderer/components/drawer/drawer";
import hostedClusterIdInjectable from "../../../../renderer/cluster-frame-context/hosted-cluster-id.injectable";
import userPreferencesStateInjectable from "../../../user-preferences/common/state.injectable";
import { aiChatCancelChannel, aiChatSendMessageChannel } from "../../common/channels";
import conversationStoreInjectable from "../stores/conversation-store.injectable";
import { ChatInput } from "./chat-input";
import { ChatMessage } from "./chat-message";
import { ChatOnboarding } from "./chat-onboarding";
import { ProviderSelector } from "./provider-selector";

import type { UserPreferencesState } from "../../../user-preferences/common/state.injectable";
import type { AiChatRequest, AiChatRequestAck } from "../../common/types";
import type { ConversationStore } from "../stores/conversation-store.injectable";

interface Dependencies {
  conversationStore: ConversationStore;
  hostedClusterId: string | undefined;
  requestFromChannel: <Req, Res>(channel: { id: string; _requestSignature?: Req; _responseSignature?: Res }, req: Req) => Promise<Res>;
  sendMessageToChannel: <Msg>(channel: { id: string; _messageSignature?: Msg }, msg: Msg) => void;
  userPreferences: UserPreferencesState;
}

const NonInjectedChatDrawer = observer(({
  conversationStore,
  hostedClusterId,
  requestFromChannel,
  sendMessageToChannel,
  userPreferences,
}: Dependencies) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages appear
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversationStore.messages.length, conversationStore.lastAssistantMessage?.content]);

  // Set the cluster context when the hosted cluster changes
  useEffect(() => {
    if (hostedClusterId) {
      conversationStore.setCluster(hostedClusterId, hostedClusterId);
    }
  }, [hostedClusterId, conversationStore]);

  // Sync provider from preferences
  useEffect(() => {
    const provider = userPreferences.aiProviderActiveProvider;

    if (provider === "anthropic" || provider === "openai") {
      conversationStore.setProvider(provider);
    }
  }, [userPreferences.aiProviderActiveProvider, conversationStore]);

  const handleSend = useCallback(async (text: string) => {
    conversationStore.addUserMessage(text);

    // Ensure we have a conversationId
    if (!conversationStore.conversationId) {
      conversationStore.newConversationId();
    }

    // Start assistant message placeholder
    conversationStore.startAssistantMessage();

    const request: AiChatRequest = {
      conversationId: conversationStore.conversationId,
      clusterId: conversationStore.clusterId,
      providerId: conversationStore.providerId,
      messages: conversationStore.messagesForRequest,
    };

    try {
      const ack: AiChatRequestAck = await requestFromChannel(aiChatSendMessageChannel, request);

      if (!ack.accepted) {
        conversationStore.finishStreaming();
        conversationStore.addErrorMessage(ack.error || "Request was not accepted.");
      }
    } catch (error: unknown) {
      conversationStore.finishStreaming();
      conversationStore.addErrorMessage(
        error instanceof Error ? error.message : "Failed to send message.",
      );
    }
  }, [conversationStore, requestFromChannel]);

  const handleCancel = useCallback(() => {
    if (conversationStore.isStreaming && conversationStore.conversationId) {
      sendMessageToChannel(aiChatCancelChannel, { conversationId: conversationStore.conversationId });
    }
  }, [conversationStore, sendMessageToChannel]);

  const handleClose = useCallback(() => {
    conversationStore.setDrawerOpen(false);
    handleCancel();
  }, [conversationStore, handleCancel]);

  const hasApiKey = Boolean(
    conversationStore.providerId === "anthropic"
      ? userPreferences.aiProviderApiKeyAnthropic
      : userPreferences.aiProviderApiKeyOpenai,
  );

  return (
    <Drawer
      open={conversationStore.isDrawerOpen}
      title="AI Chat"
      position="right"
      onClose={handleClose}
      toolbar={<ProviderSelector />}
      data-testid="ai-chat-drawer"
    >
      <div className="AiChatDrawer">
        {!hasApiKey ? (
          <ChatOnboarding providerId={conversationStore.providerId} />
        ) : (
          <>
            <div className="AiChatDrawer__messages">
              {conversationStore.messages.map((msg, idx) => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  isStreaming={
                    conversationStore.isStreaming
                    && idx === conversationStore.messages.length - 1
                    && msg.role === "assistant"
                  }
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
            <ChatInput
              onSend={handleSend}
              onCancel={handleCancel}
              isStreaming={conversationStore.isStreaming}
            />
          </>
        )}
      </div>
    </Drawer>
  );
});

export const ChatDrawer = withInjectables<Dependencies>(NonInjectedChatDrawer, {
  getProps: (di) => ({
    conversationStore: di.inject(conversationStoreInjectable),
    hostedClusterId: di.inject(hostedClusterIdInjectable),
    requestFromChannel: di.inject(requestFromChannelInjectionToken),
    sendMessageToChannel: di.inject(sendMessageToChannelInjectionToken),
    userPreferences: di.inject(userPreferencesStateInjectable),
  }),
});
