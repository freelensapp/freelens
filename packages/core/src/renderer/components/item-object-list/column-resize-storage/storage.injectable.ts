/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import createStorageInjectable from "../../../utils/create-storage/create-storage.injectable";

export interface ColumnResizeStorageState {
  [tableId: string]: {
    [columnId: string]: number;
  };
}

const columnResizeStorageInjectable = getInjectable({
  id: "column-resize-storage",

  instantiate: (di) => {
    const createStorage = di.inject(createStorageInjectable);

    return createStorage<ColumnResizeStorageState>("column-resizes", {});
  },
});

export default columnResizeStorageInjectable;
