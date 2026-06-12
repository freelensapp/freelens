/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import createResourceTabStoreInjectable from "./store.injectable";

import type { TabId } from "../dock/store";

const clearCreateResourceTabDataInjectable = getInjectable({
  id: "clear-create-resource-tab-data",

  instantiate: (di) => {
    const createResourceTabStore = di.inject(createResourceTabStoreInjectable);

    return (tabId: TabId): void => {
      createResourceTabStore.clearData(tabId);
    };
  },
});

export default clearCreateResourceTabDataInjectable;
