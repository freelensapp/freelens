/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import catalogCategoryRegistryInjectable from "./category-registry.injectable";

import type { CatalogEntity, CatalogEntityContextMenuContext } from "./catalog-entity";

export type VisitEntityContextMenu = (entity: CatalogEntity, context: CatalogEntityContextMenuContext) => void;

const visitEntityContextMenuInjectable = getInjectable({
  id: "visit-entity-context-menu",
  instantiate: (di): VisitEntityContextMenu => {
    const categoryRegistry = di.inject(catalogCategoryRegistryInjectable);

    return (entity, context) => {
      entity.onContextMenuOpen?.(context);
      categoryRegistry.getCategoryForEntity(entity)?.emit("contextMenuOpen", entity, context);
    };
  },
});

export default visitEntityContextMenuInjectable;
