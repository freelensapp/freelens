/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import logStoreInjectable from "./store.injectable";

const clearVisibleLogsInjectable = getInjectable({
  id: "clear-visible-logs",

  instantiate: (di) => {
    const logStore = di.inject(logStoreInjectable);

    return (tabId: string): void => logStore.clearVisibleLogs(tabId);
  },
});

export default clearVisibleLogsInjectable;
