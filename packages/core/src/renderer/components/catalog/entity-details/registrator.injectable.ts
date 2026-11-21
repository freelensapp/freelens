/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import * as uuid from "uuid";
import { extensionRegistratorInjectionToken } from "../../../../extensions/extension-loader/extension-registrator-injection-token";
import guardExtensionComponentsInjectable from "../../../extension-loader/guard-extension-components.injectable";
import { catalogEntityDetailItemInjectionToken } from "./token";

import type { LensRendererExtension } from "../../../../extensions/lens-renderer-extension";
import type { CatalogEntity } from "../../../api/catalog-entity";
import type { ExtensionComponentGuard } from "../../../extension-loader/guard-extension-components.injectable";
import type { CatalogEntityDetailRegistration } from "./token";

const catalogEntityDetailItemsRegistratorInjectable = getInjectable({
  id: "catalog-entity-detail-items-registrator",
  instantiate: (di) => {
    const guardExtensionComponents = di.inject(guardExtensionComponentsInjectable);

    return (ext) => {
      const extension = ext as LensRendererExtension;
      const guard = guardExtensionComponents(extension, "catalogEntityDetailItems");

      return extension.catalogEntityDetailItems.map(getRegistratorFor(extension, guard));
    };
  },
  injectionToken: extensionRegistratorInjectionToken,
});

export default catalogEntityDetailItemsRegistratorInjectable;

const getRegistratorFor =
  (extension: LensRendererExtension, guard: ExtensionComponentGuard) =>
  ({ apiVersions, components, kind, priority }: CatalogEntityDetailRegistration<CatalogEntity>) =>
    getInjectable({
      id: `catalog-entity-detail-item-for-${extension.sanitizedExtensionId}-${uuid.v4()}`,
      instantiate: () => ({
        apiVersions: new Set(apiVersions),
        components: {
          ...components,
          // A panel in the details of the catalog, which renders in the root frame with no boundary around it.
          Details: guard.component(components.Details, { fallback: "view", resetKey: ({ entity }) => entity }),
        },
        kind,
        orderNumber: priority ?? 50,
      }),
      injectionToken: catalogEntityDetailItemInjectionToken,
    });
