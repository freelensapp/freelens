/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { RequestChannel } from "@freelensapp/messaging";

export const aiToolDefinitions = [
  {
    id: "claude-code",
    name: "Claude Code",
    description: "The coding assistant by Anthropic",
    command: "claude",
    installUrl: "https://docs.anthropic.com/en/docs/claude-code/overview",
  },
  {
    id: "copilot-cli",
    name: "GitHub Copilot CLI",
    description: "The coding assistant by GitHub",
    command: "copilot",
    installUrl: "https://docs.github.com/en/copilot/concepts/agents/about-copilot-cli",
  },
  {
    id: "antigravity-cli",
    name: "Antigravity CLI",
    description: "The coding assistant by Google",
    command: "agy",
    installUrl: "https://antigravity.google/",
  },
  {
    id: "codex-cli",
    name: "Codex CLI",
    description: "The coding assistant by OpenAI",
    command: "codex",
    installUrl: "https://developers.openai.com/codex/cli",
  },
  {
    id: "opencode",
    name: "OpenCode",
    description: "Open-source AI coding agent",
    command: "opencode",
    installUrl: "https://opencode.ai/docs/cli/",
  },
  {
    id: "custom",
    name: "Custom",
    description: "Runs your own configured command",
    command: "",
    installUrl: "",
  },
] as const;

export type AiToolId = (typeof aiToolDefinitions)[number]["id"];

export interface DetectedAiTool {
  id: AiToolId;
  name: string;
  description: string;
  command: string;
  installUrl: string;
  commandPath?: string;
}

export interface DetectAiToolsRequest {
  customCommand: string;
}

export const detectAiToolsChannel: RequestChannel<DetectAiToolsRequest, DetectedAiTool[]> = {
  id: "detect-ai-tools",
};
