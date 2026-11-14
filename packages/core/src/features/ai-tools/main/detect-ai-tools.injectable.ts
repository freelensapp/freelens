/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getRequestChannelListenerInjectable } from "@freelensapp/messaging";
import { aiToolProviderInjectionToken, detectAiToolsChannel, normalizeAiToolSettings } from "../common/ai-tools";
import { detectAiTool } from "./detect-ai-tools";
import { findExecutable, readVersion } from "./find-executable";

const detectAiToolsListenerInjectable = getRequestChannelListenerInjectable({
  id: "detect-ai-tools-listener",
  channel: detectAiToolsChannel,
  getHandler: (di) => {
    const providers = di.injectMany(aiToolProviderInjectionToken);

    return async ({ settings, ids }) => {
      const normalized = normalizeAiToolSettings(settings);
      const selected = ids ? providers.filter((provider) => ids.includes(provider.id)) : providers;

      return Promise.all(
        selected.map((provider) =>
          detectAiTool(provider, normalized, {
            findExecutable: (command) => findExecutable(command),
            readVersion,
          }),
        ),
      );
    };
  },
});

export default detectAiToolsListenerInjectable;
