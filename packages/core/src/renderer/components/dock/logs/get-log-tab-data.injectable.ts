/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import logTabStoreInjectable from "./tab-store.injectable";

import type { LogTabData } from "./tab-store";

const getLogTabDataInjectable = getInjectable({
  id: "get-log-tab-data",

  instantiate: (di) => {
    const logTabStore = di.inject(logTabStoreInjectable);

    return (tabId: string): LogTabData | undefined => logTabStore.getData(tabId);
  },
});

export default getLogTabDataInjectable;
