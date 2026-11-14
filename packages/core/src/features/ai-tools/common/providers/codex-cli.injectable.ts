/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { aiToolProviderInjectionToken } from "../ai-tools";

import type { AiToolProvider } from "../ai-tools";

const codexCliAiToolProviderInjectable = getInjectable({
  id: "ai-tool-provider-codex-cli",
  instantiate: (): AiToolProvider => ({
    id: "codex-cli",
    name: "OpenAI Codex CLI",
    vendor: "OpenAI",
    description: "OpenAI's coding agent for the terminal",
    iconText: "Cx",
    iconColor: "#10a37f",
    defaultExecutable: "codex",
    defaultArguments: "--sandbox read-only {prompt}",
    versionArguments: ["--version"],
    readOnlyMode:
      "Read-only sandbox (--sandbox read-only): Codex asks for approval before anything outside the sandbox.",
    installUrl: "https://developers.openai.com/codex/cli",
    installSteps: [{ label: "npm", command: "npm install -g @openai/codex" }],
    orderNumber: 20,
  }),
  injectionToken: aiToolProviderInjectionToken,
});

export default codexCliAiToolProviderInjectable;
