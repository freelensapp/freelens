/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { aiToolProviderInjectionToken } from "../ai-tools";

import type { AiToolProvider } from "../ai-tools";

const openCodeAiToolProviderInjectable = getInjectable({
  id: "ai-tool-provider-opencode",
  instantiate: (): AiToolProvider => ({
    id: "opencode",
    name: "OpenCode",
    vendor: "SST",
    description: "Open-source AI coding agent for the terminal",
    iconText: "Oc",
    iconColor: "#f59e0b",
    defaultExecutable: "opencode",
    defaultArguments: "run {prompt}",
    versionArguments: ["--version"],
    installUrl: "https://opencode.ai/docs/",
    installSteps: [
      {
        label: "Install script",
        command: "curl -fsSL https://opencode.ai/install | bash",
        platforms: ["darwin", "linux"],
      },
      { label: "npm", command: "npm install -g opencode-ai" },
    ],
    orderNumber: 50,
  }),
  injectionToken: aiToolProviderInjectionToken,
});

export default openCodeAiToolProviderInjectable;
