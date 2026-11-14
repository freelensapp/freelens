/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { aiToolProviderInjectionToken } from "../ai-tools";

import type { AiToolProvider } from "../ai-tools";

const copilotCliAiToolProviderInjectable = getInjectable({
  id: "ai-tool-provider-copilot-cli",
  instantiate: (): AiToolProvider => ({
    id: "copilot-cli",
    name: "GitHub Copilot CLI",
    vendor: "GitHub",
    description: "GitHub Copilot's agent for the terminal",
    iconText: "Gh",
    iconColor: "#6e7681",
    defaultExecutable: "copilot",
    defaultArguments: "-i {prompt}",
    versionArguments: ["--version"],
    readOnlyMode: "Copilot CLI asks for approval before it runs a tool or shell command.",
    installUrl: "https://docs.github.com/en/copilot/how-tos/set-up/install-copilot-cli",
    installSteps: [
      { label: "npm", command: "npm install -g @github/copilot" },
      { label: "Homebrew", command: "brew install copilot-cli", platforms: ["darwin", "linux"] },
    ],
    orderNumber: 30,
  }),
  injectionToken: aiToolProviderInjectionToken,
});

export default copilotCliAiToolProviderInjectable;
