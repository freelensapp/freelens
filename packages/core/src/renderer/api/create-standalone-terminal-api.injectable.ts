/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import defaultWebsocketApiParamsInjectable from "./default-websocket-api-params.injectable";
import requestStandaloneShellTokenInjectable from "./request-standalone-shell-token.injectable";
import { TerminalApi } from "./terminal-api";

import type { TerminalApiDependencies } from "./terminal-api";

export type CreateStandaloneTerminalApi = (tabId: string) => TerminalApi;

/**
 * Unlike {@link createTerminalApiInjectable} this needs no cluster frame: the
 * root frame is served by the same proxy, and the shell it asks for belongs to
 * no cluster.
 */
const createStandaloneTerminalApiInjectable = getInjectable({
  id: "create-standalone-terminal-api",

  instantiate: (di): CreateStandaloneTerminalApi => {
    const deps: TerminalApiDependencies = {
      logger: di.inject(loggerInjectionToken),
      defaultParams: di.inject(defaultWebsocketApiParamsInjectable),
      requestShellToken: di.inject(requestStandaloneShellTokenInjectable),
    };

    return (tabId) => new TerminalApi(deps, { id: tabId, type: "standalone" });
  },
});

export default createStandaloneTerminalApiInjectable;
