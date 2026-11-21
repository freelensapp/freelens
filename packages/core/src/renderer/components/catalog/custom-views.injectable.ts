/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getOrInsert, getOrInsertMap, getOrInsertWith } from "@freelensapp/utilities";
import { getInjectable } from "@ogre-tools/injectable";
import { orderBy } from "es-toolkit/compat";
import { computed } from "mobx";
import rendererExtensionsInjectable from "../../../extensions/renderer-extensions.injectable";
import guardExtensionComponentsInjectable from "../../extension-loader/guard-extension-components.injectable";

import type { IComputedValue } from "mobx";

import type { LensRendererExtension } from "../../../extensions/lens-renderer-extension";
import type { GuardExtensionComponents } from "../../extension-loader/guard-extension-components.injectable";
import type { CustomCategoryViewComponents } from "./custom-views";

interface Dependencies {
  extensions: IComputedValue<LensRendererExtension[]>;
  guardExtensionComponents: GuardExtensionComponents;
}

export interface RegisteredCustomCategoryViewDecl {
  /**
   * The asc sorted list of items with priority set to < 50
   */
  before: CustomCategoryViewComponents[];
  /**
   * The asc sorted list of items with priority not set or set to >= 50
   */
  after: CustomCategoryViewComponents[];
}

function getCustomCategoryViews({
  extensions,
  guardExtensionComponents,
}: Dependencies): IComputedValue<Map<string, Map<string, RegisteredCustomCategoryViewDecl>>> {
  // The guarded components of each registration, kept across recomputations, so that React keeps the views mounted.
  const guardedComponents = new WeakMap<CustomCategoryViewComponents, CustomCategoryViewComponents>();

  const guardViewsOf = (extension: LensRendererExtension) => {
    const guard = guardExtensionComponents(extension, "customCategoryViews");

    return (components: CustomCategoryViewComponents) =>
      getOrInsertWith(guardedComponents, components, () => ({
        View: guard.component(components.View, { fallback: "view" }),
      }));
  };

  return computed(() => {
    const res = new Map<string, Map<string, RegisteredCustomCategoryViewDecl>>();
    const registrations = extensions
      .get()
      .flatMap((ext) => {
        const guardViews = guardViewsOf(ext);

        return ext.customCategoryViews.map((registration) => ({
          ...registration,
          components: guardViews(registration.components),
        }));
      })
      .map(({ priority = 50, ...rest }) => ({ priority, ...rest }));
    const sortedRegistrations = orderBy(registrations, "priority", "asc");

    for (const { priority, group, kind, components } of sortedRegistrations) {
      const byGroup = getOrInsertMap(res, group);
      const { before, after } = getOrInsert(byGroup, kind, { before: [], after: [] });

      if (priority < 50) {
        before.push(components);
      } else {
        after.push(components);
      }
    }

    return res;
  });
}

const customCategoryViewsInjectable = getInjectable({
  id: "custom-category-views",

  instantiate: (di) =>
    getCustomCategoryViews({
      extensions: di.inject(rendererExtensionsInjectable),
      guardExtensionComponents: di.inject(guardExtensionComponentsInjectable),
    }),
});

export default customCategoryViewsInjectable;
