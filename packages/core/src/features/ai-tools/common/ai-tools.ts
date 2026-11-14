/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectionToken } from "@ogre-tools/injectable";

import type { MessageChannel, RequestChannel } from "@freelensapp/messaging";

import type { AskAiRequest } from "./ask-ai-request";

/**
 * Identifies a provider in the registry. Open-ended so that new providers,
 * including those of extensions, need no change here.
 */
export type AiToolId = string;

export type AiToolPlatform = "darwin" | "linux" | "win32";

export interface AiToolInstallStep {
  /** What the command does, e.g. "npm", "Homebrew", "Install script". */
  label: string;
  command: string;
  /** Platforms the step applies to; all of them when omitted. */
  platforms?: AiToolPlatform[];
}

/**
 * A command-line AI assistant ProLens can launch in its integrated terminal.
 * Providers are registered with `aiToolProviderInjectionToken`.
 */
export interface AiToolProvider {
  id: AiToolId;
  name: string;
  vendor: string;
  description: string;
  /** One or two characters shown in the provider's badge. */
  iconText: string;
  /** Background colour of the badge. */
  iconColor: string;
  /** Executable looked up on `PATH` when no path is configured. Empty for the custom provider. */
  defaultExecutable: string;
  /**
   * Argument template. `{prompt}` stands for the prompt as one argument; when
   * the template has none, the prompt is appended as the last argument.
   */
  defaultArguments: string;
  /** Arguments used to read the version; omit when the tool has none. */
  versionArguments?: string[];
  /**
   * How the default arguments keep the assistant from changing the cluster,
   * shown next to the arguments. Undefined when the tool has no such mode.
   */
  readOnlyMode?: string;
  installUrl?: string;
  installSteps: AiToolInstallStep[];
  orderNumber: number;
}

export const aiToolProviderInjectionToken = getInjectionToken<AiToolProvider>({
  id: "ai-tool-provider",
});

export const customAiToolId = "custom";

export interface AiToolSetting {
  /** Executable name or absolute path; the provider's default when empty. */
  executablePath?: string;
  /** Argument template; the provider's default when undefined. */
  arguments?: string;
}

export type AiToolSettings = Record<AiToolId, AiToolSetting>;

const nonEmptyString = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : undefined);

export const normalizeAiToolSettings = (value: unknown): AiToolSettings => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const settings: AiToolSettings = {};

  for (const [id, setting] of Object.entries(value as Record<string, unknown>)) {
    if (!setting || typeof setting !== "object") {
      continue;
    }

    const { executablePath, arguments: args } = setting as Record<string, unknown>;
    const normalized: AiToolSetting = {};
    const path = nonEmptyString(executablePath);

    if (path) {
      normalized.executablePath = path;
    }

    if (typeof args === "string") {
      normalized.arguments = args;
    }

    if (Object.keys(normalized).length) {
      settings[id] = normalized;
    }
  }

  return settings;
};

export const getExecutableFor = (provider: AiToolProvider, settings: AiToolSettings) =>
  settings[provider.id]?.executablePath?.trim() || provider.defaultExecutable;

export const getArgumentsFor = (provider: AiToolProvider, settings: AiToolSettings) =>
  settings[provider.id]?.arguments ?? provider.defaultArguments;

export type AiToolStatus = "installed" | "not-installed" | "not-configured" | "error";

export interface AiToolDetection {
  id: AiToolId;
  status: AiToolStatus;
  /** The command that was looked up. */
  executable: string;
  /** Absolute path of the executable when it was found. */
  resolvedPath?: string;
  version?: string;
  error?: string;
}

export interface DetectAiToolsRequest {
  settings: AiToolSettings;
  /** Only detect these providers; all of them when omitted. */
  ids?: AiToolId[];
}

export const detectAiToolsChannel: RequestChannel<DetectAiToolsRequest, AiToolDetection[]> = {
  id: "detect-ai-tools",
};

export interface PrepareAiLaunchRequest {
  prompt: string;
  /** Name of the assistant, shown when it asks for approval. */
  providerName: string;
  /** The cluster whose terminal the assistant runs in. */
  clusterId: string;
}

export type PrepareAiLaunchResponse =
  | { callWasSuccessful: true; response: { promptFilePath: string; tokenFilePath: string; sessionId: string } }
  | { callWasSuccessful: false; error: string };

/**
 * Prepares a launch in main: writes the prompt to a private file, so the
 * terminal gets a short command that reads it, and issues the assistant its
 * own AI session token for the cluster, written to a private file too. With
 * that token the ProLens proxy lets reads through and holds every other
 * request until the user approves it (see kube-request-policy.ts).
 */
export const prepareAiLaunchChannel: RequestChannel<PrepareAiLaunchRequest, PrepareAiLaunchResponse> = {
  id: "prepare-ai-launch",
};

/**
 * The environment variable the credential plugin of the proxy kubeconfig
 * reads the ProLens proxy token from (freelensProxyTokenEnvVar in main).
 */
export const proxyTokenEnvVar = "FREELENS_PROXY_TOKEN";

export interface AiApprovalRequest {
  id: string;
  providerName: string;
  clusterName: string;
  /** e.g. "delete pods web-1 in namespace shop". */
  action: string;
  reason: "mutation" | "interactive" | "secret";
  method: string;
  /** Path and query as the cluster would get them. */
  path: string;
  /** Epoch milliseconds after which the request is denied unanswered. */
  expiresAt: number;
}

/**
 * From main to the root frame: an AI session wants to do something that
 * needs the user's approval.
 */
export const aiApprovalRequestChannel: MessageChannel<AiApprovalRequest> = {
  id: "ai-approval-request",
};

/**
 * From main to the root frame: a request was answered or timed out, so its
 * prompt goes away even if this frame's timers were throttled meanwhile.
 */
export const aiApprovalResolvedChannel: MessageChannel<string> = {
  id: "ai-approval-resolved",
};

export interface AiApprovalDecision {
  id: string;
  approved: boolean;
}

/**
 * From the root frame to main: the user's answer.
 */
export const aiApprovalDecisionChannel: RequestChannel<AiApprovalDecision, void> = {
  id: "ai-approval-decision",
};

export interface AskAiInClusterRequest {
  clusterId: string;
  request: AskAiRequest;
}

export type AskAiInClusterResponse = { callWasSuccessful: true } | { callWasSuccessful: false; error: string };

/**
 * From the root frame to main: open Ask AI in the frame of a cluster, which
 * owns that cluster's terminal.
 */
export const askAiInClusterChannel: RequestChannel<AskAiInClusterRequest, AskAiInClusterResponse> = {
  id: "ask-ai-in-cluster",
};

/**
 * From main to a cluster frame.
 */
export const askAiInClusterFrameChannel: MessageChannel<AskAiRequest> = {
  id: "ask-ai-in-cluster-frame",
};

/*
 * Integration points for AI backends other than command-line tools: local
 * models (Ollama), OpenAI-compatible endpoints, external agent platforms and
 * MCP servers (Kubernetes, Prometheus, Argo CD, Helm, GitLab, Terraform).
 * See docs/prolens/ai-extensibility.md. They are declared, not implemented:
 * a backend registers through `aiBackendInjectionToken` in main.
 */

/**
 * A reference to a secret held by main (for example in the OS keychain
 * through Electron's safeStorage). Only the id ever reaches the renderer,
 * logs or prompts; main resolves it when it makes the request.
 */
export interface AiCredentialRef {
  credentialId: string;
}

export type AiBackendKind = "ollama" | "openai-compatible" | "agent-platform";

export interface AiBackendConfiguration {
  id: string;
  kind: AiBackendKind;
  displayName: string;
  /** e.g. http://localhost:11434 for Ollama, https://api.example.com/v1 otherwise. */
  baseUrl: string;
  model?: string;
  credential?: AiCredentialRef;
}

export interface AiChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AiBackendRequest {
  configuration: AiBackendConfiguration;
  messages: AiChatMessage[];
  signal?: AbortSignal;
}

/**
 * An API-based assistant, run in main so credentials never leave it.
 * `stream` yields the answer as it arrives.
 */
export interface AiBackend {
  kind: AiBackendKind;
  validate: (configuration: AiBackendConfiguration) => Promise<{ ok: true } | { ok: false; error: string }>;
  stream: (request: AiBackendRequest) => AsyncIterable<string>;
}

export const aiBackendInjectionToken = getInjectionToken<AiBackend>({
  id: "ai-backend",
});

/**
 * An MCP server ProLens can offer to an assistant. For CLI tools this ends up
 * in their MCP configuration; for API backends main connects to it directly.
 */
export interface McpServerConfiguration {
  id: string;
  displayName: string;
  transport: { type: "stdio"; command: string; args: string[] } | { type: "http"; url: string };
  /** Environment for a stdio server; values that are secrets are references. */
  env?: Record<string, string | AiCredentialRef>;
  /** Whether the server may only read. Servers that can change state need explicit approval per call. */
  readOnly: boolean;
}
