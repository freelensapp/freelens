/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React from "react";
import { isKubernetesCluster, KubernetesCluster } from "../../../common/catalog-entities";
import { broadcastMessage } from "../../../common/ipc";
import { catalogEntityRunListener } from "../../../common/ipc/catalog";
import catalogEnitiesInjectable from "../../api/catalog/entity/entities.injectable";
import commandOverlayInjectable from "../command-palette/command-overlay.injectable";
import { Select } from "../select";

import type { IComputedValue } from "mobx";

import type { CatalogEntity } from "../../api/catalog-entity";

interface Dependencies {
  closeCommandOverlay: () => void;
  entities: IComputedValue<CatalogEntity[]>;
}

const sortByLastSeen = (prev: KubernetesCluster, next: KubernetesCluster) => {
  const prevLastSeen = typeof prev.metadata?.lastSeen === "string" ? prev.metadata?.lastSeen : "";
  const nextLastSeen = typeof next.metadata?.lastSeen === "string" ? next.metadata?.lastSeen : "";

  if (!prevLastSeen && !nextLastSeen) return 0;
  if (!prevLastSeen) return 1;
  if (!nextLastSeen) return -1;
  return nextLastSeen.localeCompare(prevLastSeen); // desc
};

const NonInjectedClustersSearchCommand = observer(({ closeCommandOverlay, entities }: Dependencies) => (
  <Select
    id="clusters-search-input"
    menuPortalTarget={null}
    onChange={(option) => {
      if (option) {
        broadcastMessage(catalogEntityRunListener, option.value.getId());
        closeCommandOverlay();
      }
    }}
    components={{ DropdownIndicator: null, IndicatorSeparator: null }}
    menuIsOpen={true}
    options={entities
      .get()
      .filter(isKubernetesCluster)
      .slice()
      .sort((prev, next) => sortByLastSeen(prev, next))
      .map((entity) => ({ value: entity, label: `Cluster: ${entity.getName()}` }))}
    autoFocus={true}
    escapeClearsValue={false}
    placeholder="Search clusters by name ..."
  />
));

export const ClustersSearchCommand = withInjectables<Dependencies>(NonInjectedClustersSearchCommand, {
  getProps: (di) => ({
    closeCommandOverlay: di.inject(commandOverlayInjectable).close,
    entities: di.inject(catalogEnitiesInjectable),
  }),
});
