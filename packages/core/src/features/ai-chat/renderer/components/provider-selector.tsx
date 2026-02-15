/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./provider-selector.scss";

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React from "react";
import userPreferencesStateInjectable from "../../../user-preferences/common/state.injectable";
import conversationStoreInjectable from "../stores/conversation-store.injectable";

import type { UserPreferencesState } from "../../../user-preferences/common/state.injectable";
import type { AiProviderId } from "../../common/types";
import type { ConversationStore } from "../stores/conversation-store.injectable";

interface Dependencies {
  conversationStore: ConversationStore;
  userPreferences: UserPreferencesState;
}

const providerLabels: Record<AiProviderId, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
};

const allProviders: AiProviderId[] = ["anthropic", "openai"];

const NonInjectedProviderSelector = observer(({ conversationStore, userPreferences }: Dependencies) => {
  // Only show providers that have API keys configured
  const availableProviders = allProviders.filter((id) => {
    if (id === "anthropic") return !!userPreferences.aiProviderApiKeyAnthropic;
    if (id === "openai") return !!userPreferences.aiProviderApiKeyOpenai;

    return false;
  });

  if (availableProviders.length <= 1) {
    return null;
  }

  return (
    <select
      className="AiProviderSelector"
      value={conversationStore.providerId}
      onChange={(e) => {
        const newProvider = e.target.value as AiProviderId;

        conversationStore.setProvider(newProvider);
        userPreferences.aiProviderActiveProvider = newProvider;
      }}
      data-testid="ai-provider-selector"
    >
      {availableProviders.map((id) => (
        <option key={id} value={id}>
          {providerLabels[id]}
        </option>
      ))}
    </select>
  );
});

export const ProviderSelector = withInjectables<Dependencies>(NonInjectedProviderSelector, {
  getProps: (di) => ({
    conversationStore: di.inject(conversationStoreInjectable),
    userPreferences: di.inject(userPreferencesStateInjectable),
  }),
});
