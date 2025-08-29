/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Icon } from "@freelensapp/icon";
import { cssNames } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import identity from "lodash/identity";
import { observable, reaction, runInAction } from "mobx";
import { disposeOnUnmount, observer } from "mobx-react";
import React from "react";
import apiManagerInjectable from "../../../common/k8s-api/api-manager/manager.injectable";
import navigateInjectable from "../../navigation/navigate.injectable";
import withConfirmationInjectable from "../confirm-dialog/with-confirm.injectable";
import createEditResourceTabInjectable from "../dock/edit-resource/edit-resource-tab.injectable";
import hideDetailsInjectable from "../kube-detail-params/hide-details.injectable";
import { MenuActions, MenuItem } from "../menu";
import clusterNameInjectable from "./cluster-name.injectable";
import kubeObjectDeleteServiceInjectable from "./kube-object-delete-service.injectable";
import kubeObjectMenuItemsInjectable from "./kube-object-menu-items.injectable";
import onKubeObjectContextMenuOpenInjectable from "./on-context-menu-open.injectable";

import type { KubeObject } from "@freelensapp/kube-object";

import type { IComputedValue } from "mobx";

import type { ApiManager } from "../../../common/k8s-api/api-manager";
import type { KubeObjectContextMenuItem } from "../../kube-object/handler";
import type { Navigate } from "../../navigation/navigate.injectable";
import type { WithConfirmation } from "../confirm-dialog/with-confirm.injectable";
import type { HideDetails } from "../kube-detail-params/hide-details.injectable";
import type { MenuActionsProps } from "../menu";
import type { KubeObjectDeleteService } from "./kube-object-delete-service.injectable";
import type { OnKubeObjectContextMenuOpen } from "./on-context-menu-open.injectable";

export interface KubeObjectMenuProps<TKubeObject extends KubeObject> extends MenuActionsProps {
  object: TKubeObject;
  editable?: boolean;
  removable?: boolean;
}

interface Dependencies {
  apiManager: ApiManager;
  kubeObjectMenuItems: IComputedValue<React.ElementType[]>;
  clusterName: IComputedValue<string | undefined>;
  hideDetails: HideDetails;
  createEditResourceTab: (kubeObject: KubeObject) => void;
  onContextMenuOpen: OnKubeObjectContextMenuOpen;
  withConfirmation: WithConfirmation;
  navigate: Navigate;
  kubeObjectDeleteService: KubeObjectDeleteService;
}

@observer
class NonInjectedKubeObjectMenu<Kube extends KubeObject> extends React.Component<
  KubeObjectMenuProps<Kube> & Dependencies
> {
  private menuItems = observable.array<KubeObjectContextMenuItem>();

  componentDidUpdate(prevProps: Readonly<KubeObjectMenuProps<Kube> & Dependencies>): void {
    if (prevProps.object !== this.props.object && this.props.object) {
      this.emitOnContextMenuOpen(this.props.object);
    }
  }

  componentDidMount(): void {
    disposeOnUnmount(this, [
      reaction(
        () => this.props.object?.metadata?.deletionTimestamp,
        () => {
          if (this.props.object) {
            this.emitOnContextMenuOpen(this.props.object);
          }
        },
      ),
      reaction(
        () => this.props.object?.getFinalizers(),
        () => {
          if (this.props.object) {
            this.emitOnContextMenuOpen(this.props.object);
          }
        },
      ),
    ]);
  }

  private renderRemoveMessage(object: KubeObject) {
    const breadcrumbParts = [object.getNs(), object.getName()];
    const breadcrumb = breadcrumbParts.filter(identity).join("/");

    return (
      <p>
        {`Remove ${object.kind} `}
        <b>{breadcrumb}</b>
        {" from "}
        <b>{this.props.clusterName.get()}</b>?
      </p>
    );
  }

  private renderMenuItems() {
    const { object, toolbar } = this.props;

    return this.props.kubeObjectMenuItems
      .get()
      .map((MenuItem, index) => <MenuItem object={object} toolbar={toolbar} key={`menu-item-${index}`} />);
  }

  private emitOnContextMenuOpen(object: KubeObject) {
    const {
      apiManager,
      editable,
      removable,
      hideDetails,
      createEditResourceTab,
      withConfirmation,
      removeAction,
      onContextMenuOpen,
      navigate,
      updateAction,
      kubeObjectDeleteService,
    } = this.props;

    // Get the latest object from the store to ensure we have current state
    const store = apiManager.getStore(object.selfLink);
    const latestObject = store?.getByPath(object.selfLink) || object;

    const isEditable = editable ?? (Boolean(store?.patch) || Boolean(updateAction));
    const isRemovable = removable ?? (Boolean(store?.remove) || Boolean(removeAction));

    runInAction(() => {
      this.menuItems.clear();

      if (isRemovable) {
        // Determine the appropriate delete mode based on current object state
        const getDeleteMode = (obj: KubeObject): "normal" | "force" | "finalizers" => {
          // Check if object is in terminating state
          if (obj.metadata.deletionTimestamp) {
            return "finalizers";
          }

          // Check if object has finalizers
          if (obj.getFinalizers().length > 0) {
            return "force";
          }

          return "normal";
        };

        const getDeleteConfig = (mode: "normal" | "force" | "finalizers") => {
          switch (mode) {
            case "normal":
              return {
                title: "Delete",
                icon: "delete",
                labelOk: "Delete",
              };
            case "force":
              return {
                title: "Force Delete",
                icon: "delete_forever",
                labelOk: "Force Delete",
              };
            case "finalizers":
              return {
                title: "Delete with Finalizers",
                icon: "delete_sweep",
                labelOk: "Delete",
              };
          }
        };

        const deleteMode = getDeleteMode(latestObject);
        const config = getDeleteConfig(deleteMode);

        this.menuItems.push({
          id: "delete-kube-object",
          title: config.title,
          icon: config.icon,
          onClick: withConfirmation({
            message: this.renderRemoveMessage(latestObject),
            labelOk: config.labelOk,
            ok: async () => {
              hideDetails();
              await kubeObjectDeleteService.delete(latestObject, deleteMode);
            },
          }),
        });
      }

      if (isEditable) {
        this.menuItems.push({
          id: "edit-kube-object",
          title: "Edit",
          icon: "edit",
          onClick: async () => {
            hideDetails();

            if (updateAction) {
              await updateAction();
            } else {
              createEditResourceTab(latestObject);
            }
          },
        });
      }
    });

    onContextMenuOpen(latestObject, {
      menuItems: this.menuItems,
      navigate,
    });
  }

  private renderContextMenuItems = (object: KubeObject) => {
    const { apiManager } = this.props;
    const store = apiManager.getStore(object.selfLink);
    const latestObject = store?.getByPath(object.selfLink) || object;

    return [...this.menuItems]
      .reverse() // This is done because the order that we "grow" is right->left
      .map(({ icon, ...rest }) => ({
        ...rest,
        icon: typeof icon === "string" ? { material: icon } : icon,
      }))
      .map((item, index) => (
        <MenuItem
          key={`context-menu-item-${index}`}
          onClick={() => item.onClick(latestObject)}
          data-testid={`menu-action-${item.title.toLowerCase().replace(/\s+/, "-")}-for-${latestObject.selfLink}`}
        >
          <Icon {...item.icon} interactive={this.props.toolbar} tooltip={item.title} />
          <span className="title">{item.title}</span>
        </MenuItem>
      ));
  };

  render() {
    const {
      className,
      editable,
      removable,
      object,
      removeAction, // This is here so we don't pass it down to `<MenuAction>`
      removeConfirmationMessage, // This is here so we don't pass it down to `<MenuAction>`
      updateAction, // This is here so we don't pass it down to `<MenuAction>`
      ...menuProps
    } = this.props;

    return (
      <MenuActions
        id={`menu-actions-for-kube-object-menu-for-${object?.getId()}`}
        data-testid={`menu-actions-for-kube-object-menu-for-${object?.getId()}`}
        className={cssNames("KubeObjectMenu", className)}
        onOpen={object ? () => this.emitOnContextMenuOpen(object) : undefined}
        {...menuProps}
      >
        {this.renderMenuItems()}
        {object && this.renderContextMenuItems(object)}
      </MenuActions>
    );
  }
}

export const KubeObjectMenu = withInjectables<Dependencies, KubeObjectMenuProps<KubeObject>>(
  NonInjectedKubeObjectMenu,
  {
    getProps: (di, props) => ({
      ...props,
      clusterName: di.inject(clusterNameInjectable),
      apiManager: di.inject(apiManagerInjectable),
      createEditResourceTab: di.inject(createEditResourceTabInjectable),
      hideDetails: di.inject(hideDetailsInjectable),
      kubeObjectMenuItems: di.inject(kubeObjectMenuItemsInjectable, props.object),
      onContextMenuOpen: di.inject(onKubeObjectContextMenuOpenInjectable),
      navigate: di.inject(navigateInjectable),
      withConfirmation: di.inject(withConfirmationInjectable),
      kubeObjectDeleteService: di.inject(kubeObjectDeleteServiceInjectable),
    }),
  },
) as <T extends KubeObject>(props: KubeObjectMenuProps<T>) => React.ReactElement;
