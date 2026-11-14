/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import activeHotbarInjectable from "../../../features/hotbar/storage/common/active.injectable";
import { MenuItem } from "../menu";

import type { IComputedValue } from "mobx";

import type { Hotbar } from "../../../features/hotbar/storage/common/hotbar";
import type { CatalogEntity } from "../../api/catalog-entity";

interface Dependencies {
  activeHotbar: IComputedValue<Hotbar | undefined>;
}

interface HotbarFolderMenuItemsProps {
  entity: CatalogEntity;
}

const NonInjectedHotbarFolderMenuItems = observer(
  ({ entity, activeHotbar }: Dependencies & HotbarFolderMenuItemsProps) => {
    const hotbar = activeHotbar.get();
    const folders = hotbar?.getFolders() ?? [];

    return (
      <>
        {folders.map((folder) => (
          <MenuItem
            key={`hotbar-folder-${folder.id}`}
            data-testid={`move-to-hotbar-folder-${folder.id}-for-${entity.getId()}`}
            onClick={() => hotbar?.addEntityToFolder(folder.id, entity)}
          >
            {`Move to Folder: ${folder.name}`}
          </MenuItem>
        ))}
      </>
    );
  },
);

export const HotbarFolderMenuItems = withInjectables<Dependencies, HotbarFolderMenuItemsProps>(
  NonInjectedHotbarFolderMenuItems,
  {
    getProps: (di, props) => ({
      ...props,
      activeHotbar: di.inject(activeHotbarInjectable),
    }),
  },
);
