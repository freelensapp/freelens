/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import createStorageInjectable from "../../../utils/create-storage/create-storage.injectable";
import { CreateResourceTabStore } from "./store";

const createResourceTabStoreInjectable = getInjectable({
  id: "create-resource-tab-store",

  instantiate: (di) =>
    new CreateResourceTabStore({
      createStorage: di.inject(createStorageInjectable),
    }),
});

export default createResourceTabStoreInjectable;
