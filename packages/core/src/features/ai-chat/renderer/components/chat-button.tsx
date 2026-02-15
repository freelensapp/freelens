/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./chat-button.scss";

import { Icon } from "@freelensapp/icon";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React from "react";
import conversationStoreInjectable from "../stores/conversation-store.injectable";

import type { ConversationStore } from "../stores/conversation-store.injectable";

interface Dependencies {
  conversationStore: ConversationStore;
}

const NonInjectedChatButton = observer(({ conversationStore }: Dependencies) => {
  if (conversationStore.isDrawerOpen) {
    return null;
  }

  return (
    <button
      className="AiChatButton"
      onClick={(e) => {
        e.stopPropagation();
        conversationStore.toggleDrawer();
      }}
      data-testid="ai-chat-button"
      aria-label="Toggle AI Chat"
      title="AI Chat"
    >
      <Icon material="smart_toy" />
    </button>
  );
});

export const ChatButton = withInjectables<Dependencies>(NonInjectedChatButton, {
  getProps: (di) => ({
    conversationStore: di.inject(conversationStoreInjectable),
  }),
});
