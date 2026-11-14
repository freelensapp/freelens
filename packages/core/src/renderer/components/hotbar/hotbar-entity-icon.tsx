/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Icon } from "@freelensapp/icon";
import { cssNames } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observable } from "mobx";
import { observer } from "mobx-react";
import React from "react";
import catalogCategoryRegistryInjectable from "../../../common/catalog/category-registry.injectable";
import visitEntityContextMenuInjectable from "../../../common/catalog/visit-entity-context-menu.injectable";
import { LensKubernetesClusterStatus } from "../../../common/catalog-entities/kubernetes-cluster";
import activeEntityInjectable from "../../api/catalog/entity/active.injectable";
import navigateInjectable from "../../navigation/navigate.injectable";
import styles from "./hotbar-entity-icon.module.scss";
import { HotbarIcon } from "./hotbar-icon";

import type { IClassName } from "@freelensapp/utilities";

import type { IComputedValue } from "mobx";

import type { CatalogCategoryRegistry, CatalogEntity, CatalogEntityContextMenu } from "../../../common/catalog";
import type { VisitEntityContextMenu } from "../../../common/catalog/visit-entity-context-menu.injectable";
import type { HotbarFolder } from "../../../features/hotbar/storage/common/types";
import type { Navigate } from "../../navigation/navigate.injectable";

export interface HotbarEntityIconProps {
  entity: CatalogEntity;
  index: number;
  errorClass?: IClassName;
  add: (item: CatalogEntity, index: number) => void;
  remove: (uid: string) => void;
  /**
   * The name shown in the hotbar instead of the entity's own name.
   */
  displayName?: string;
  rename?: () => void;
  folders?: HotbarFolder[];
  moveToFolder?: (folderId: string, entity: CatalogEntity) => void;
  size?: number;
  onClick?: () => void;
  className?: string;
}

interface Dependencies {
  visitEntityContextMenu: VisitEntityContextMenu;
  catalogCategoryRegistry: CatalogCategoryRegistry;
  activeEntity: IComputedValue<CatalogEntity | undefined>;
  navigate: Navigate;
}

@observer
class NonInjectedHotbarEntityIcon extends React.Component<HotbarEntityIconProps & Dependencies> {
  private readonly menuItems = observable.array<CatalogEntityContextMenu>();

  private renderKindIcon() {
    const className = styles.badge;
    const category = this.props.catalogCategoryRegistry.getCategoryForEntity(this.props.entity);

    if (!category) {
      return <Icon material="bug_report" className={className} />;
    }

    if (Icon.isSvg(category.metadata.icon)) {
      return <Icon svg={category.metadata.icon} className={className} />;
    }

    return <Icon material={category.metadata.icon} className={className} />;
  }

  private renderLedIcon() {
    if (this.props.entity.kind !== "KubernetesCluster") {
      return null;
    }

    return (
      <div
        className={cssNames(styles.led, {
          // TODO: make it more generic
          [styles.online]: this.props.entity.status.phase === LensKubernetesClusterStatus.CONNECTED,
        })}
      />
    );
  }

  isActive(item: CatalogEntity) {
    return this.props.activeEntity.get()?.metadata?.uid == item.getId();
  }

  onMenuOpen() {
    this.menuItems.replace([
      {
        title: "Remove from Hotbar",
        onClick: () => this.props.remove(this.props.entity.getId()),
      },
      ...(this.props.rename
        ? [
            {
              title: "Rename in Hotbar",
              onClick: this.props.rename,
            },
          ]
        : []),
      ...(this.props.folders ?? []).map((folder) => ({
        title: `Move to Folder: ${folder.name}`,
        onClick: () => this.props.moveToFolder?.(folder.id, this.props.entity),
      })),
    ]);

    this.props.visitEntityContextMenu(this.props.entity, {
      menuItems: this.menuItems,
      navigate: this.props.navigate,
    });
  }

  render() {
    const { entity, displayName, className, onClick } = this.props;
    const name = entity.getName();
    const details = [displayName && name, entity.metadata.source].filter(Boolean).join(", ");

    return (
      <HotbarIcon
        uid={entity.getId()}
        title={displayName || name}
        // Keep the colour of the entity's own name, so renaming changes only the initials.
        colorHash={entity.metadata.source ? `${name}-${entity.metadata.source}` : name}
        source={entity.metadata.source}
        src={entity.spec.icon?.src}
        material={entity.spec.icon?.material}
        background={entity.spec.icon?.background}
        className={className}
        active={this.isActive(entity)}
        onMenuOpen={() => this.onMenuOpen()}
        disabled={!entity}
        menuItems={this.menuItems}
        tooltip={details ? `${displayName || name} (${details})` : name}
        onClick={onClick}
      >
        {this.renderLedIcon()}
        {this.renderKindIcon()}
      </HotbarIcon>
    );
  }
}

export const HotbarEntityIcon = withInjectables<Dependencies, HotbarEntityIconProps>(NonInjectedHotbarEntityIcon, {
  getProps: (di, props) => ({
    ...props,
    catalogCategoryRegistry: di.inject(catalogCategoryRegistryInjectable),
    visitEntityContextMenu: di.inject(visitEntityContextMenuInjectable),
    activeEntity: di.inject(activeEntityInjectable),
    navigate: di.inject(navigateInjectable),
  }),
});
