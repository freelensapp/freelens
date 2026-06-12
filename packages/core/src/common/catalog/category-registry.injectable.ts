/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable, getInjectionToken } from "@ogre-tools/injectable";
import { CatalogCategoryRegistry } from "./category-registry";

import type { CatalogCategory } from "./catalog-entity";

export const builtInCategoryInjectionToken = getInjectionToken<CatalogCategory>({
  id: "built-in-category-token",
});

const catalogCategoryRegistryInjectable = getInjectable({
  id: "catalog-category-registry",
  instantiate: (di) => {
    const registry = new CatalogCategoryRegistry();
    const categories = di.injectMany(builtInCategoryInjectionToken);

    for (const category of categories) {
      registry.add(category);
    }

    return registry;
  },
});

export default catalogCategoryRegistryInjectable;
