/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import createStorageInjectable from "../../../utils/create-storage/create-storage.injectable";
import { EditResourceTabStore } from "./store";

const editResourceTabStoreInjectable = getInjectable({
  id: "edit-resource-tab-store",

  instantiate: (di) =>
    new EditResourceTabStore({
      createStorage: di.inject(createStorageInjectable),
    }),
});

export default editResourceTabStoreInjectable;
