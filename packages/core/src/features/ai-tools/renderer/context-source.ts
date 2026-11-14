/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectionToken } from "@ogre-tools/injectable";

import type { AiPromptSection, AskAiTarget } from "../common/ask-ai-request";

/**
 * Supplies one kind of context to an Ask AI prompt: the manifest, events,
 * logs today; metrics, GitOps state, Helm release history or an MCP server's
 * answer later. Each source is a checkbox in the Ask AI dialog, so the user
 * decides what leaves the application.
 */
export interface AiContextSource {
  id: string;
  label: string;
  /** Shown under the checkbox. */
  description: string;
  orderNumber: number;
  isAvailableFor: (target: AskAiTarget) => boolean;
  /** Ticked by default. Sources that send logs or events stay opt-in. */
  isEnabledByDefaultFor: (target: AskAiTarget) => boolean;
  collect: (target: AskAiTarget, signal: AbortSignal) => Promise<AiPromptSection | undefined>;
}

export const aiContextSourceInjectionToken = getInjectionToken<AiContextSource>({
  id: "ai-context-source",
});
