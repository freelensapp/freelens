/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { requestFromChannelInjectionToken } from "@freelensapp/messaging";
import { getInjectable } from "@ogre-tools/injectable";
import { action, observable, toJS } from "mobx";
import userPreferencesStateInjectable from "../../user-preferences/common/state.injectable";
import { detectAiToolsChannel } from "../common/ai-tools";

import type { AiToolDetection, AiToolId } from "../common/ai-tools";

export interface AiToolDetections {
  /** Latest result per provider; missing until the first detection finishes. */
  readonly results: ReadonlyMap<AiToolId, AiToolDetection>;
  readonly isRefreshing: boolean;
  readonly lastError: string | undefined;
  /** Detects the given providers again, all of them when omitted. */
  refresh: (ids?: AiToolId[]) => Promise<AiToolDetection[]>;
}

const aiToolDetectionsInjectable = getInjectable({
  id: "ai-tool-detections",
  instantiate: (di): AiToolDetections => {
    const requestFromChannel = di.inject(requestFromChannelInjectionToken);
    const state = di.inject(userPreferencesStateInjectable);
    const logger = di.inject(loggerInjectionToken);
    const store = observable(
      {
        results: observable.map<AiToolId, AiToolDetection>(),
        pending: 0,
        lastError: undefined as string | undefined,
      },
      { results: false },
    );

    return {
      get results() {
        return store.results;
      },
      get isRefreshing() {
        return store.pending > 0;
      },
      get lastError() {
        return store.lastError;
      },
      refresh: async (ids) => {
        action(() => {
          store.pending += 1;
        })();

        try {
          const detections = await requestFromChannel(detectAiToolsChannel, {
            settings: toJS(state.aiToolSettings),
            ids,
          });

          action(() => {
            store.lastError = undefined;

            for (const detection of detections) {
              store.results.set(detection.id, detection);
            }
          })();

          return detections;
        } catch (error) {
          logger.error("[AI-TOOLS]: detection failed", { error: String(error) });
          action(() => {
            store.lastError = String(error);
          })();

          return [];
        } finally {
          action(() => {
            store.pending -= 1;
          })();
        }
      },
    };
  },
});

export default aiToolDetectionsInjectable;
