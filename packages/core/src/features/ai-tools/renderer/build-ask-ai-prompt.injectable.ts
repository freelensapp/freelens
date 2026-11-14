/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import hostedClusterInjectable from "../../../renderer/cluster-frame-context/hosted-cluster.injectable";
import { buildAiPrompt } from "../common/ask-ai-request";
import { aiContextSourceInjectionToken } from "./context-source";

import type { AiPromptSection, AskAiTarget } from "../common/ask-ai-request";
import type { AiContextSource } from "./context-source";

export interface BuildAskAiPromptArgs {
  target: AskAiTarget;
  question: string;
  /** Ids of the context sources the user left ticked. */
  sourceIds: string[];
  signal: AbortSignal;
}

export type BuildAskAiPrompt = (args: BuildAskAiPromptArgs) => Promise<string>;

export const availableContextSources = (sources: AiContextSource[], target: AskAiTarget) =>
  sources.filter((source) => source.isAvailableFor(target)).sort((left, right) => left.orderNumber - right.orderNumber);

const buildAskAiPromptInjectable = getInjectable({
  id: "build-ask-ai-prompt",
  instantiate: (di): BuildAskAiPrompt => {
    const sources = di.injectMany(aiContextSourceInjectionToken);

    return async ({ target, question, sourceIds, signal }) => {
      const cluster = di.inject(hostedClusterInjectable);
      const selected = availableContextSources(sources, target).filter((source) => sourceIds.includes(source.id));
      const sections = await Promise.all(
        selected.map(async (source): Promise<AiPromptSection | undefined> => {
          try {
            return await source.collect(target, signal);
          } catch (error) {
            return { title: source.label, body: `(ProLens could not collect this: ${String(error)})` };
          }
        }),
      );

      return buildAiPrompt({
        question,
        clusterName: cluster?.name.get(),
        contextName: cluster?.contextName.get(),
        target,
        sections: sections.filter((section): section is AiPromptSection => Boolean(section)),
      });
    };
  },
});

export default buildAskAiPromptInjectable;
