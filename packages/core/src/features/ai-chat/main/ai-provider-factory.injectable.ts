/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import userPreferencesStateInjectable from "../../user-preferences/common/state.injectable";

import type { LanguageModel } from "ai";
import type { AiProviderId } from "../common/types";

export interface AiProviderFactory {
  createModel(providerId: AiProviderId): LanguageModel;
  hasApiKey(providerId: AiProviderId): boolean;
}

const aiProviderFactoryInjectable = getInjectable({
  id: "ai-provider-factory",

  instantiate: (di): AiProviderFactory => {
    const userPreferencesState = di.inject(userPreferencesStateInjectable);

    return {
      hasApiKey(providerId: AiProviderId): boolean {
        switch (providerId) {
          case "anthropic":
            return !!userPreferencesState.aiProviderApiKeyAnthropic;
          case "openai":
            return !!userPreferencesState.aiProviderApiKeyOpenai;
          default:
            return false;
        }
      },

      createModel(providerId: AiProviderId): LanguageModel {
        switch (providerId) {
          case "anthropic": {
            // Dynamic import avoids loading provider SDK until needed
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const { createAnthropic } = require("@ai-sdk/anthropic");
            const provider = createAnthropic({
              apiKey: userPreferencesState.aiProviderApiKeyAnthropic,
            });

            return provider(userPreferencesState.aiProviderModelAnthropic || "claude-sonnet-4-20250514");
          }

          case "openai": {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const { createOpenAI } = require("@ai-sdk/openai");
            const provider = createOpenAI({
              apiKey: userPreferencesState.aiProviderApiKeyOpenai,
            });

            return provider(userPreferencesState.aiProviderModelOpenai || "gpt-4o");
          }

          default:
            throw new Error(`Unknown AI provider: ${providerId}`);
        }
      },
    };
  },
});

export default aiProviderFactoryInjectable;
