/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { aiToolProviderInjectionToken } from "../ai-tools";

import type { AiToolProvider } from "../ai-tools";

const geminiCliAiToolProviderInjectable = getInjectable({
  id: "ai-tool-provider-gemini-cli",
  instantiate: (): AiToolProvider => ({
    id: "gemini-cli",
    name: "Gemini CLI",
    vendor: "Google",
    description: "Google's open-source AI agent for the terminal",
    iconText: "G",
    iconColor: "#4285f4",
    defaultExecutable: "gemini",
    defaultArguments: "--prompt-interactive {prompt}",
    versionArguments: ["--version"],
    readOnlyMode: "In its default approval mode, Gemini CLI asks before it runs a shell command or edits a file.",
    installUrl: "https://github.com/google-gemini/gemini-cli",
    installSteps: [
      { label: "npm", command: "npm install -g @google/gemini-cli" },
      { label: "Homebrew", command: "brew install gemini-cli", platforms: ["darwin", "linux"] },
    ],
    orderNumber: 40,
  }),
  injectionToken: aiToolProviderInjectionToken,
});

export default geminiCliAiToolProviderInjectable;
