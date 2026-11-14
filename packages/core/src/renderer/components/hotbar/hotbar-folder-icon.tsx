/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Icon } from "@freelensapp/icon";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import { useRef, useState } from "react";
import { LensKubernetesClusterStatus } from "../../../common/catalog-entities/kubernetes-cluster";
import catalogEntityRegistryInjectable from "../../api/catalog/entity/registry.injectable";
import { Avatar } from "../avatar";
import { Menu, MenuItem } from "../menu";
import styles from "./hotbar-folder-icon.module.scss";
import { HotbarIcon } from "./hotbar-icon";

import type { HotbarFolder, HotbarItem } from "../../../features/hotbar/storage/common/types";
import type { CatalogEntityRegistry } from "../../api/catalog/entity/registry";

export interface HotbarFolderIconProps {
  folder: HotbarFolder;
  size?: number;
  className?: string;
  onRename: (folder: HotbarFolder) => void;
  onRemove: (folderId: string) => void;
  onRemoveEntity: (entityId: string) => void;
  onRenameEntity: (item: HotbarItem) => void;
}

interface Dependencies {
  entityRegistry: CatalogEntityRegistry;
}

export const getHotbarFolderUid = (folderId: string) => `hotbar-folder-${folderId}`;

const NonInjectedHotbarFolderIcon = observer(
  ({
    folder,
    size = 40,
    className,
    onRename,
    onRemove,
    onRemoveEntity,
    onRenameEntity,
    entityRegistry,
  }: HotbarFolderIconProps & Dependencies) => {
    const [isOpen, setIsOpen] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const iconRef = useRef<HTMLDivElement>(null);
    const count = folder.items.length;

    const togglePanel = () => {
      const rect = iconRef.current?.getBoundingClientRect();

      if (rect) {
        // Open next to the cell instead of below it, so the panel does not
        // cover the hotbar cells under the folder.
        setPosition({ x: rect.right + 12, y: rect.top - 8 });
      }

      setIsOpen(!isOpen);
    };

    return (
      <div ref={iconRef} className={styles.HotbarFolderIcon}>
        <HotbarIcon
          uid={getHotbarFolderUid(folder.id)}
          title={folder.name}
          className={className}
          active={isOpen}
          // The open panel already shows the name, so the tooltip would only cover it.
          tooltip={isOpen ? undefined : `${folder.name} (${count} ${count === 1 ? "item" : "items"})`}
          menuItems={[
            {
              title: "Rename Folder",
              onClick: () => onRename(folder),
            },
            {
              title: "Remove Folder from Hotbar",
              onClick: () => onRemove(folder.id),
            },
          ]}
          onClick={togglePanel}
          size={size}
        >
          <Icon material="folder" className={styles.badge} />
          <span className={styles.count}>{count}</span>
        </HotbarIcon>
        <Menu
          usePortal
          isOpen={isOpen}
          open={() => setIsOpen(true)}
          close={() => setIsOpen(false)}
          contextTarget={iconRef.current}
          cursorPosition={position}
          className={styles.panel}
          data-testid={`hotbar-folder-panel-${folder.id}`}
        >
          <li className={styles.title}>{folder.name}</li>
          {count === 0 ? (
            <li className={styles.empty}>
              Use &quot;Move to Folder&quot; on a hotbar item or in the Catalog to add items here.
            </li>
          ) : (
            folder.items.map((item) => {
              const entity = entityRegistry.getById(item.entity.uid);
              const isOnline =
                entity?.kind === "KubernetesCluster" && entity.status.phase === LensKubernetesClusterStatus.CONNECTED;

              return (
                <MenuItem
                  key={item.entity.uid}
                  className={styles.item}
                  disabled={!entity}
                  onClick={() => entity && entityRegistry.onRun(entity)}
                  data-testid={`hotbar-folder-item-${item.entity.uid}`}
                  title={item.displayName ? item.entity.name : undefined}
                >
                  <Avatar
                    title={item.displayName || item.entity.name}
                    colorHash={item.entity.source ? `${item.entity.name}-${item.entity.source}` : item.entity.name}
                    src={entity?.spec.icon?.src}
                    background={entity?.spec.icon?.background}
                    className={styles.avatar}
                    size={24}
                    variant="rounded"
                  />
                  <span className={styles.name}>{item.displayName || item.entity.name}</span>
                  {isOnline && <span className={styles.online} title="Connected" />}
                  <Icon
                    small
                    material="edit"
                    className={styles.rename}
                    tooltip="Rename in Hotbar"
                    onClick={(event) => {
                      event.stopPropagation();
                      setIsOpen(false);
                      onRenameEntity(item);
                    }}
                  />
                  <Icon
                    small
                    material="close"
                    className={styles.remove}
                    tooltip="Remove from Folder"
                    onClick={(event) => {
                      event.stopPropagation();
                      onRemoveEntity(item.entity.uid);
                    }}
                  />
                </MenuItem>
              );
            })
          )}
        </Menu>
      </div>
    );
  },
);

export const HotbarFolderIcon = withInjectables<Dependencies, HotbarFolderIconProps>(NonInjectedHotbarFolderIcon, {
  getProps: (di, props) => ({
    ...props,
    entityRegistry: di.inject(catalogEntityRegistryInjectable),
  }),
});
