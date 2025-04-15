/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Icon } from "@freelensapp/icon";
import { Tooltip } from "@freelensapp/tooltip";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observable } from "mobx";
import { observer } from "mobx-react";
import React, { useState } from "react";
import type { VisitEntityContextMenu } from "../../../common/catalog/visit-entity-context-menu.injectable";
import visitEntityContextMenuInjectable from "../../../common/catalog/visit-entity-context-menu.injectable";
import { broadcastMessage } from "../../../common/ipc";
import { IpcRendererNavigationEvents } from "../../../common/ipc/navigation-events";
import type { ActiveHotbarModel } from "../../../features/hotbar/storage/common/toggling.injectable";
import activeHotbarInjectable from "../../../features/hotbar/storage/common/toggling.injectable";
import type { CatalogEntity, CatalogEntityContextMenu } from "../../api/catalog-entity";
import type { NormalizeCatalogEntityContextMenu } from "../../catalog/normalize-menu-item.injectable";
import normalizeCatalogEntityContextMenuInjectable from "../../catalog/normalize-menu-item.injectable";
import type { Navigate } from "../../navigation/navigate.injectable";
import navigateInjectable from "../../navigation/navigate.injectable";
import { Avatar } from "../avatar";
import { Menu, MenuItem } from "../menu";
import styles from "./sidebar-cluster.module.scss";

export interface SidebarClusterProps {
  clusterEntity: CatalogEntity | null | undefined;
}

interface Dependencies {
  navigate: Navigate;
  normalizeMenuItem: NormalizeCatalogEntityContextMenu;
  visitEntityContextMenu: VisitEntityContextMenu;
  entityInActiveHotbar: ActiveHotbarModel;
}

const NonInjectedSidebarCluster = observer(
  ({
    clusterEntity,
    visitEntityContextMenu: onContextMenuOpen,
    navigate,
    normalizeMenuItem,
    entityInActiveHotbar,
  }: Dependencies & SidebarClusterProps) => {
    const [menuItems] = useState(observable.array<CatalogEntityContextMenu>());
    const [opened, setOpened] = useState(false);

    if (!clusterEntity) {
      // render a Loading version of the SidebarCluster
      return (
        <div className={styles.SidebarCluster}>
          <Avatar title="??" background="var(--halfGray)" size={40} className={styles.loadingAvatar} />
          <div className={styles.loadingClusterName} />
        </div>
      );
    }

    const onMenuOpen = () => {
      const title = entityInActiveHotbar.hasEntity(clusterEntity.getId()) ? "Remove from Hotbar" : "Add to Hotbar";
      const onClick = () => entityInActiveHotbar.toggleEntity(clusterEntity);

      menuItems.replace([{ title, onClick }]);
      onContextMenuOpen(clusterEntity, {
        menuItems,
        navigate: (url, forceMainFrame = true) => {
          if (forceMainFrame) {
            broadcastMessage(IpcRendererNavigationEvents.NAVIGATE_IN_APP, url);
          } else {
            navigate(url);
          }
        },
      });

      toggle();
    };

    const onKeyDown = (evt: React.KeyboardEvent<HTMLDivElement>) => {
      if (evt.code == "Space") {
        toggle();
      }
    };

    const toggle = () => {
      setOpened(!opened);
    };

    const id = `cluster-${clusterEntity.getId()}`;
    const tooltipId = `tooltip-${id}`;

    return (
      <div
        id={id}
        className={styles.SidebarCluster}
        tabIndex={0}
        onKeyDown={onKeyDown}
        role="menubar"
        data-testid="sidebar-cluster-dropdown"
      >
        <Avatar
          title={clusterEntity.getName()}
          colorHash={`${clusterEntity.getName()}-${clusterEntity.metadata.source}`}
          size={40}
          src={clusterEntity.spec.icon?.src}
          background={clusterEntity.spec.icon?.background}
          className={styles.avatar}
        />
        <div className={styles.clusterName} id={tooltipId}>
          {clusterEntity.getName()}
        </div>
        <Tooltip targetId={tooltipId}>{clusterEntity.getName()}</Tooltip>
        <Icon material="arrow_drop_down" className={styles.dropdown} />
        <Menu
          usePortal
          htmlFor={id}
          isOpen={opened}
          open={onMenuOpen}
          closeOnClickItem
          closeOnClickOutside
          close={toggle}
          className={styles.menu}
        >
          {menuItems.map(normalizeMenuItem).map((menuItem) => (
            <MenuItem key={menuItem.title} onClick={menuItem.onClick}>
              {menuItem.title}
            </MenuItem>
          ))}
        </Menu>
      </div>
    );
  },
);

export const SidebarCluster = withInjectables<Dependencies, SidebarClusterProps>(NonInjectedSidebarCluster, {
  getProps: (di, props) => ({
    ...props,
    visitEntityContextMenu: di.inject(visitEntityContextMenuInjectable),
    navigate: di.inject(navigateInjectable),
    normalizeMenuItem: di.inject(normalizeCatalogEntityContextMenuInjectable),
    entityInActiveHotbar: di.inject(activeHotbarInjectable),
  }),
});
