/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { asLegacyGlobalForExtensionApi } from "@freelensapp/legacy-global-di";
import type { Disposer } from "@freelensapp/utilities";
import type { CatalogCategory, CatalogEntity } from "../../common/catalog";
import catalogCategoryRegistryInjectable from "../../common/catalog/category-registry.injectable";
import type { CatalogEntityOnBeforeRun } from "../../renderer/api/catalog/entity/registry";
import catalogEntityRegistryInjectable from "../../renderer/api/catalog/entity/registry.injectable";
import activeKubernetesClusterInjectable from "../../renderer/cluster-frame-context/active-kubernetes-cluster.injectable";

export const catalogCategories = asLegacyGlobalForExtensionApi(catalogCategoryRegistryInjectable);

const internalEntityRegistry = asLegacyGlobalForExtensionApi(catalogEntityRegistryInjectable);

export class CatalogEntityRegistry {
  /**
   * Currently active/visible entity
   */
  get activeEntity() {
    return internalEntityRegistry.activeEntity;
  }

  get entities(): Map<string, CatalogEntity> {
    return internalEntityRegistry.entities;
  }

  getById(id: string) {
    return this.entities.get(id);
  }

  getItemsForApiKind<T extends CatalogEntity>(apiVersion: string, kind: string): T[] {
    return internalEntityRegistry.getItemsForApiKind<T>(apiVersion, kind);
  }

  getItemsForCategory<T extends CatalogEntity>(category: CatalogCategory): T[] {
    return internalEntityRegistry.getItemsForCategory(category);
  }

  /**
   * Add a onBeforeRun hook to a catalog entities. If `onBeforeRun` was previously
   * added then it will not be added again.
   * @param onBeforeRun The function to be called with a `CatalogRunEvent`
   * event target will be the catalog entity. onBeforeRun hook can call event.preventDefault()
   * to stop run sequence
   * @returns A function to remove that hook
   */
  addOnBeforeRun(onBeforeRun: CatalogEntityOnBeforeRun): Disposer {
    return internalEntityRegistry.addOnBeforeRun(onBeforeRun);
  }
}

export const catalogEntities = new CatalogEntityRegistry();

export const activeCluster = asLegacyGlobalForExtensionApi(activeKubernetesClusterInjectable);
