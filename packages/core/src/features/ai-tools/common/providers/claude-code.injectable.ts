/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { aiToolProviderInjectionToken } from "../ai-tools";

import type { AiToolProvider } from "../ai-tools";

const claudeCodeAiToolProviderInjectable = getInjectable({
  id: "ai-tool-provider-claude-code",
  instantiate: (): AiToolProvider => ({
    id: "claude-code",
    name: "Claude Code",
    vendor: "Anthropic",
    description: "Anthropic's agentic coding assistant for the terminal",
    iconText: "C",
    iconColor: "#d97757",
    defaultExecutable: "claude",
    defaultArguments: "--permission-mode plan {prompt}",
    versionArguments: ["--version"],
    readOnlyMode:
      "Plan mode (--permission-mode plan): Claude Code investigates and proposes, and asks before it changes anything.",
    installUrl: "https://docs.anthropic.com/en/docs/claude-code/setup",
    installSteps: [
      {
        label: "Install script",
        command: "curl -fsSL https://claude.ai/install.sh | bash",
        platforms: ["darwin", "linux"],
      },
      { label: "PowerShell", command: "irm https://claude.ai/install.ps1 | iex", platforms: ["win32"] },
      { label: "npm", command: "npm install -g @anthropic-ai/claude-code" },
    ],
    orderNumber: 10,
  }),
  injectionToken: aiToolProviderInjectionToken,
});

export default claudeCodeAiToolProviderInjectable;
