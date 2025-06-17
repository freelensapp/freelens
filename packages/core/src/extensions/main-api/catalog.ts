/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { asLegacyGlobalForExtensionApi } from "@freelensapp/legacy-global-di";
import catalogCategoryRegistryInjectable from "../../common/catalog/category-registry.injectable";
import catalogEntityRegistryInjectable from "../../main/catalog/entity-registry.injectable";

import type { CatalogEntity } from "../../common/catalog";

export const catalogCategories = asLegacyGlobalForExtensionApi(catalogCategoryRegistryInjectable);
const catalogEntityRegistry = asLegacyGlobalForExtensionApi(catalogEntityRegistryInjectable);

export interface CatalogEntityRegistry {
  getItemsForApiKind(apiVersion: string, kind: string): CatalogEntity[];
  /**
   * @deprecated use a cast instead of a unbounded type parameter
   */
  getItemsForApiKind<T extends CatalogEntity>(apiVersion: string, kind: string): T[];
}

export const catalogEntities: CatalogEntityRegistry = {
  getItemsForApiKind(apiVersion: string, kind: string) {
    return catalogEntityRegistry.filterItemsForApiKind(apiVersion, kind);
  },
};
