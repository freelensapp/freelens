/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { byOrderNumber } from "@freelensapp/utilities";
import { getInjectable, lifecycleEnum } from "@ogre-tools/injectable";
import { computedInjectManyInjectable } from "@ogre-tools/injectable-extension-for-mobx";
import { computed } from "mobx";
import type { CatalogEntity } from "../../api/catalog-entity";
import { entitySettingInjectionToken } from "./token";

const catalogEntitySettingItemsInjectable = getInjectable({
  id: "catalog-entity-setting-items",
  instantiate: (di, entity) => {
    const computedInjectMany = di.inject(computedInjectManyInjectable);
    const items = computedInjectMany(entitySettingInjectionToken);

    return computed(() =>
      items
        .get()
        .filter(
          (item) =>
            item.apiVersions.has(entity.apiVersion) &&
            item.kind === entity.kind &&
            (!item.source || item.source === entity.metadata.source),
        )
        .sort(byOrderNumber),
    );
  },
  lifecycle: lifecycleEnum.keyedSingleton({
    getInstanceKey: (di, entity: CatalogEntity) =>
      `${entity.apiVersion}/${entity.kind}[${entity.metadata.source ?? ""}]`,
  }),
});

export default catalogEntitySettingItemsInjectable;
