/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { aiToolProviderInjectionToken, customAiToolId } from "../ai-tools";

import type { AiToolProvider } from "../ai-tools";

const customCommandAiToolProviderInjectable = getInjectable({
  id: "ai-tool-provider-custom",
  instantiate: (): AiToolProvider => ({
    id: customAiToolId,
    name: "Custom command",
    vendor: "You",
    description: "Any other AI CLI. Set its executable and an argument template.",
    iconText: ">_",
    iconColor: "#64748b",
    defaultExecutable: "",
    defaultArguments: "{prompt}",
    installSteps: [],
    orderNumber: 1000,
  }),
  injectionToken: aiToolProviderInjectionToken,
});

export default customCommandAiToolProviderInjectable;
