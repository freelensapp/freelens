/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import defaultWebsocketApiParamsInjectable from "./default-websocket-api-params.injectable";
import requestClusterShellTokenInjectable from "./request-cluster-shell-token.injectable";
import { TerminalApi } from "./terminal-api";

import type { TerminalApiDependencies, TerminalApiQuery } from "./terminal-api";

export type CreateTerminalApi = (query: TerminalApiQuery) => TerminalApi;

const createTerminalApiInjectable = getInjectable({
  id: "create-terminal-api",
  instantiate: (di): CreateTerminalApi => {
    const deps: TerminalApiDependencies = {
      logger: di.inject(loggerInjectionToken),
      defaultParams: di.inject(defaultWebsocketApiParamsInjectable),
      requestShellToken: di.inject(requestClusterShellTokenInjectable),
    };

    return (query) => new TerminalApi(deps, query);
  },
});

export default createTerminalApiInjectable;
