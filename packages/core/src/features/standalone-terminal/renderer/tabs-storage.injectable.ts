/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import createStorageInjectable from "../../../renderer/utils/create-storage/create-storage.injectable";

import type { StandaloneTerminalTabsState } from "./tabs-store";

/**
 * In the root frame this lands in `<lens-local-storage>/app.json`, i.e. per
 * app rather than per cluster, which is what a cluster-less terminal wants.
 */
const standaloneTerminalTabsStorageInjectable = getInjectable({
  id: "standalone-terminal-tabs-storage",

  instantiate: (di) => {
    const createStorage = di.inject(createStorageInjectable);

    return createStorage<StandaloneTerminalTabsState>("standalone-terminals", { tabs: [] });
  },
});

export default standaloneTerminalTabsStorageInjectable;
