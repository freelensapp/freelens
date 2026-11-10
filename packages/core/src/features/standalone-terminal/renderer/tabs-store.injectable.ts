/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { v4 as uuid } from "uuid";
import standaloneTerminalTabsStorageInjectable from "./tabs-storage.injectable";
import { StandaloneTerminalTabsStore } from "./tabs-store";

const standaloneTerminalTabsStoreInjectable = getInjectable({
  id: "standalone-terminal-tabs-store",

  instantiate: (di) =>
    new StandaloneTerminalTabsStore({
      storage: di.inject(standaloneTerminalTabsStorageInjectable),
      createTabId: () => uuid(),
    }),
});

export default standaloneTerminalTabsStoreInjectable;
