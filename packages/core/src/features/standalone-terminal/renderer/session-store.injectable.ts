/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import createStandaloneTerminalApiInjectable from "../../../renderer/api/create-standalone-terminal-api.injectable";
import createTerminalInjectable from "../../../renderer/components/dock/terminal/create-terminal.injectable";
import { StandaloneTerminalSessionStore } from "./session-store";

const standaloneTerminalSessionStoreInjectable = getInjectable({
  id: "standalone-terminal-session-store",

  instantiate: (di) =>
    new StandaloneTerminalSessionStore({
      createTerminal: di.inject(createTerminalInjectable),
      createStandaloneTerminalApi: di.inject(createStandaloneTerminalApiInjectable),
    }),
});

export default standaloneTerminalSessionStoreInjectable;
