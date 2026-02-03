/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Icon } from "@freelensapp/icon";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React from "react";
import { NavLink } from "react-router-dom";
import { sideBarItemCustomResourcePrefix } from "../custom-resource-definitions/groups-sidebar-items-computed.injectable";
import favoritesStoreInjectable, { FavoritesStore } from "../favorites/store.injectable";
import styles from "./sidebar-items.module.scss";
import sidebarStorageInjectable from "./sidebar-storage/sidebar-storage.injectable";

import type { SidebarItemDeclaration } from "@freelensapp/cluster-sidebar";

import type { StorageLayer } from "../../utils/storage-helper";
import type { SidebarStorageState } from "./sidebar-storage/sidebar-storage.injectable";
import favoritesOverviewSidebarItemInjectable from "../favorites/overview/sidebar-item.injectable";

interface Dependencies {
  sidebarStorage: StorageLayer<SidebarStorageState>;
  favoritesStore: FavoritesStore;
}

export interface SidebarItemProps {
  item: SidebarItemDeclaration;
}

const NonInjectedSidebarItem = observer((props: SidebarItemProps & Dependencies) => {
  const { item, sidebarStorage, favoritesStore } = props;
  const id = item.id;
  const expanded = sidebarStorage.get().expanded[id] ?? false;
  const isExpandable = item.children.length > 0 && item.children.some((item) => item.isVisible.get());
  const isActive = item.isActive.get();
  const isFavorite = favoritesStore.has(id);

  const toggleExpand = () => {
    sidebarStorage.merge((draft) => {
      draft.expanded[id] = !draft.expanded[id];
    });
  };

  const toggleFavorite = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    item.id.includes(sideBarItemCustomResourcePrefix)
      ? favoritesStore.toggle(item, "crd")
      : favoritesStore.toggle(item, "static");
  };

  const renderSubMenu = () => {
    if (!isExpandable || !expanded) {
      return null;
    }

    return (
      <div className={styles.subMenu}>
        {item.children.map((child) => (
          <SidebarItem key={child.id} item={child} />
        ))}
      </div>
    );
  };

  if (!item.isVisible.get()) {
    return null;
  }

  return (
    <div
      className={styles.SidebarItem}
      data-testid={id}
      data-is-active-test={isActive}
      data-parent-id-test={item.parentId}
    >
      <NavLink
        to={""}
        isActive={() => isActive}
        className={styles.navItem}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();

          if (isExpandable) {
            toggleExpand();
          } else {
            item.onClick();
          }
        }}
        data-testid={`link-for-${id}`}
      >
        {item.getIcon?.()}
        <span>{item.title}</span>
        {isExpandable && (
          <Icon
            className={styles.expandIcon}
            material={expanded ? "keyboard_arrow_up" : "keyboard_arrow_down"}
            data-testid={`expand-icon-for-${id}`}
            small
          />
        )}
        {item.parentId && !isExpandable && id !== favoritesOverviewSidebarItemInjectable.id && (
          <Icon
            className={styles.pinIcon}
            svg={isFavorite ? "push_off" : "push_pin"}
            data-testid={`pin-icon-for-${id}`}
            onClick={(event) => toggleFavorite(event)}
            size={16}
          />
        )}
      </NavLink>
      {renderSubMenu()}
    </div>
  );
});

export const SidebarItem = withInjectables<Dependencies, SidebarItemProps>(NonInjectedSidebarItem, {
  getProps: (di, props) => ({
    ...props,
    sidebarStorage: di.inject(sidebarStorageInjectable),
    favoritesStore: di.inject(favoritesStoreInjectable),
  }),
});

SidebarItem.displayName = "SidebarItem";
