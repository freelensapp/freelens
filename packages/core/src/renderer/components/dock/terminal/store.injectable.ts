/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import createTerminalApiInjectable from "../../../api/create-terminal-api.injectable";
import createTerminalInjectable from "./create-terminal.injectable";
import { TerminalStore } from "./store";

const terminalStoreInjectable = getInjectable({
  id: "terminal-store",

  instantiate: (di) =>
    new TerminalStore({
      createTerminal: di.inject(createTerminalInjectable),
      createTerminalApi: di.inject(createTerminalApiInjectable),
    }),
});

export default terminalStoreInjectable;
