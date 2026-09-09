/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { debounce } from "es-toolkit/compat";
import broadcastMessageInjectable from "../../common/ipc/broadcast-message.injectable";
import { catalogItemsChannel } from "../../common/ipc/catalog";

import type { DebouncedFunc } from "es-toolkit/compat";

import type { CatalogEntity } from "../../common/catalog";

// The return type is annotated explicitly because `debounce` with `leading`
// infers `DebouncedFuncLeading`, which `es-toolkit/compat` does not export;
// without the annotation the inferred type is not portable in declaration
// emit (TS2883). `DebouncedFunc` is exported and is all consumers need.
const catalogSyncBroadcasterInjectable = getInjectable({
  id: "catalog-sync-broadcaster",
  instantiate: (di): DebouncedFunc<(items: CatalogEntity[]) => void> => {
    const broadcastMessage = di.inject(broadcastMessageInjectable);

    return debounce(
      (items: CatalogEntity[]) => {
        broadcastMessage(catalogItemsChannel, items);
      },
      100,
      {
        leading: true,
        trailing: true,
      },
    );
  },
});

export default catalogSyncBroadcasterInjectable;
