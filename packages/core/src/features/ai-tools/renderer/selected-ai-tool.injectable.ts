/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import userPreferencesStateInjectable from "../../user-preferences/common/state.injectable";
import aiToolProvidersInjectable from "./ai-tool-providers.injectable";

/**
 * The provider chosen as default AI assistant, or undefined when none is
 * chosen or the chosen one is no longer registered.
 */
const selectedAiToolInjectable = getInjectable({
  id: "selected-ai-tool",
  instantiate: (di) => {
    const state = di.inject(userPreferencesStateInjectable);
    const providers = di.inject(aiToolProvidersInjectable);

    return computed(() => providers.find((provider) => provider.id === state.aiTool));
  },
});

export default selectedAiToolInjectable;
