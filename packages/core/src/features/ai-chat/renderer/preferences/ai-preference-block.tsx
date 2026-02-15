/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./ai-preference-block.scss";

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React from "react";
import { Input } from "../../../../renderer/components/input";
import { SubTitle } from "../../../../renderer/components/layout/sub-title";
import { Select } from "../../../../renderer/components/select";
import userPreferencesStateInjectable from "../../../user-preferences/common/state.injectable";

import type { UserPreferencesState } from "../../../user-preferences/common/state.injectable";

interface Dependencies {
  state: UserPreferencesState;
}

const anthropicModels = [
  { value: "claude-opus-4-6", label: "Claude 4.6 Opus" },
  { value: "claude-sonnet-4-5", label: "Claude 4.5 Sonnet" },
  { value: "claude-haiku-4-5", label: "Claude 4.5 Haiku" },
];

const openaiModels = [
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini" },
  { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
];

const providerOptions = [
  { value: "anthropic", label: "Anthropic" },
  { value: "openai", label: "OpenAI" },
];

const NonInjectedAiPreferenceBlock = observer(({ state }: Dependencies) => {
  const [anthropicKey, setAnthropicKey] = React.useState(state.aiProviderApiKeyAnthropic || "");
  const [openaiKey, setOpenaiKey] = React.useState(state.aiProviderApiKeyOpenai || "");

  return (
    <div className="AiPreferenceBlock">
      <section>
        <SubTitle title="Active Provider" />
        <Select
          id="ai-provider-select"
          options={providerOptions}
          value={state.aiProviderActiveProvider}
          onChange={(value) => {
            if (value?.value) {
              state.aiProviderActiveProvider = value.value;
            }
          }}
          themeName="lens"
        />
      </section>

      <section>
        <SubTitle title="Anthropic API Key" />
        <Input
          theme="round-black"
          type="password"
          placeholder="sk-ant-..."
          value={anthropicKey}
          onChange={(v) => setAnthropicKey(v)}
          onBlur={() => (state.aiProviderApiKeyAnthropic = anthropicKey || undefined)}
        />
        <small className="hint">
          Get your API key from{" "}
          <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer">
            console.anthropic.com
          </a>
        </small>
      </section>

      <section>
        <SubTitle title="Anthropic Model" />
        <Select
          id="ai-anthropic-model-select"
          options={anthropicModels}
          value={state.aiProviderModelAnthropic}
          onChange={(value) => {
            if (value?.value) {
              state.aiProviderModelAnthropic = value.value;
            }
          }}
          themeName="lens"
        />
      </section>

      <section>
        <SubTitle title="OpenAI API Key" />
        <Input
          theme="round-black"
          type="password"
          placeholder="sk-..."
          value={openaiKey}
          onChange={(v) => setOpenaiKey(v)}
          onBlur={() => (state.aiProviderApiKeyOpenai = openaiKey || undefined)}
        />
        <small className="hint">
          Get your API key from{" "}
          <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer">
            platform.openai.com
          </a>
        </small>
      </section>

      <section>
        <SubTitle title="OpenAI Model" />
        <Select
          id="ai-openai-model-select"
          options={openaiModels}
          value={state.aiProviderModelOpenai}
          onChange={(value) => {
            if (value?.value) {
              state.aiProviderModelOpenai = value.value;
            }
          }}
          themeName="lens"
        />
      </section>
    </div>
  );
});

export const AiPreferenceBlock = withInjectables<Dependencies>(NonInjectedAiPreferenceBlock, {
  getProps: (di) => ({
    state: di.inject(userPreferencesStateInjectable),
  }),
});
