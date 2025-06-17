/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { observableHistoryInjectionToken } from "@freelensapp/routing";
import type { Disposer } from "@freelensapp/utilities";
import { disposer } from "@freelensapp/utilities";
import { getInjectable } from "@ogre-tools/injectable";
import { reaction, when } from "mobx";
import generalCategoryInjectable from "../../../common/catalog/categories/general.injectable";
import type { GeneralEntity } from "../../../common/catalog-entities";
import isActiveRouteInjectable from "../../navigation/is-route-active.injectable";
import catalogEntityRegistryInjectable from "../catalog/entity/registry.injectable";

export type WatchForGeneralEntityNavigation = () => Disposer;

const watchForGeneralEntityNavigationInjectable = getInjectable({
  id: "watch-for-general-entity-navigation",
  instantiate: (di): WatchForGeneralEntityNavigation => {
    const observableHistory = di.inject(observableHistoryInjectionToken);
    const isActiveRoute = di.inject(isActiveRouteInjectable);
    const entityRegistry = di.inject(catalogEntityRegistryInjectable);
    const generalCategory = di.inject(generalCategoryInjectable);

    return () => {
      const dispose = disposer();

      dispose.push(
        when(
          () => entityRegistry.entities.size > 0,
          () => {
            dispose.push(
              reaction(
                () => observableHistory.location,
                () => {
                  const entities = entityRegistry.getItemsForCategory(generalCategory) as GeneralEntity[];
                  const activeEntity = entities.find((entity) => isActiveRoute(entity.spec.path));

                  if (activeEntity) {
                    entityRegistry.activeEntity = activeEntity;
                  }
                },
                {
                  fireImmediately: true,
                },
              ),
            );
          },
        ),
      );

      return dispose;
    };
  },
});

export default watchForGeneralEntityNavigationInjectable;
