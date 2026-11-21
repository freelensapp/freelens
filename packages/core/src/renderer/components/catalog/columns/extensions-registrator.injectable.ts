/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { extensionRegistratorInjectionToken } from "../../../../extensions/extension-loader/extension-registrator-injection-token";
import guardExtensionComponentsInjectable from "../../../extension-loader/guard-extension-components.injectable";
import { customCatalogCategoryColumnInjectionToken } from "./custom-token";

import type { LensRendererExtension } from "../../../../extensions/lens-renderer-extension";
import type { ExtensionComponentGuard } from "../../../extension-loader/guard-extension-components.injectable";
import type { AdditionalCategoryColumnRegistration } from "../custom-category-columns";

const customCategoryColumnsRegistratorInjectable = getInjectable({
  id: "custom-category-columns-registrator",
  instantiate: (di) => {
    const guardExtensionComponents = di.inject(guardExtensionComponentsInjectable);

    return (ext) => {
      const extension = ext as LensRendererExtension;
      const guard = guardExtensionComponents(extension, "additionalCategoryColumns");

      return extension.additionalCategoryColumns.map(getInjectableForColumnRegistrationFor(extension, guard));
    };
  },
  injectionToken: extensionRegistratorInjectionToken,
});

export default customCategoryColumnsRegistratorInjectable;

const getInjectableForColumnRegistrationFor =
  (extension: LensRendererExtension, guard: ExtensionComponentGuard) =>
  ({
    group,
    id,
    kind,
    renderCell,
    titleProps,
    priority = 50,
    searchFilter,
    sortCallback,
  }: AdditionalCategoryColumnRegistration) => {
    return getInjectable({
      id: `${extension.manifest.name}:${group}/${kind}:${id}`,
      instantiate: () => ({
        group,
        kind,
        registration: {
          // The table calls it from its own render, so what it throws would reach the boundary of the catalog.
          renderCell: guard.render(renderCell),
          priority,
          id,
          titleProps: {
            id,
            ...titleProps,
            sortBy: sortCallback ? id : undefined,
          },
          searchFilter,
          sortCallback,
        },
      }),
      injectionToken: customCatalogCategoryColumnInjectionToken,
    });
  };
