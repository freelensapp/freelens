/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./chat-onboarding.scss";

import { Icon } from "@freelensapp/icon";
import { withInjectables } from "@ogre-tools/injectable-react";
import React from "react";
import navigateToPreferencesInjectable from "../../../preferences/common/navigate-to-preferences.injectable";

import type { AiProviderId } from "../../common/types";

export interface ChatOnboardingProps {
  providerId: AiProviderId;
}

interface Dependencies {
  navigateToPreferences: (tabId?: string) => void;
}

const providerNames: Record<AiProviderId, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
};

const NonInjectedChatOnboarding = ({
  providerId,
  navigateToPreferences,
}: ChatOnboardingProps & Dependencies) => (
  <div className="AiChatOnboarding" data-testid="ai-chat-onboarding">
    <Icon material="smart_toy" className="AiChatOnboarding__icon" />
    <h3>AI Chat</h3>
    <p>
      To get started, add your <strong>{providerNames[providerId]}</strong> API key in{" "}
      <strong>Preferences → AI Assistant</strong>.
    </p>
    <button
      className="AiChatOnboarding__preferences-btn"
      onClick={() => navigateToPreferences("ai-assistant")}
      data-testid="ai-chat-open-preferences"
    >
      Open AI Assistant Preferences
    </button>
    <p className="AiChatOnboarding__hint">
      The AI assistant can help you explore and manage your Kubernetes cluster
      using natural language.
    </p>
  </div>
);

export const ChatOnboarding = withInjectables<Dependencies, ChatOnboardingProps>(NonInjectedChatOnboarding, {
  getProps: (di, props) => ({
    ...props,
    navigateToPreferences: di.inject(navigateToPreferencesInjectable),
  }),
});
