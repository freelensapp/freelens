/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./menu-actions.scss";

import { Icon } from "@freelensapp/icon";
import { getRandomIdInjectionToken } from "@freelensapp/random";
import { cssNames } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import autoBindReact from "auto-bind/react";
import isString from "lodash/isString";
import { makeObservable, observable, reaction } from "mobx";
import { disposeOnUnmount, observer } from "mobx-react";
import React, { isValidElement } from "react";
import openConfirmDialogInjectable from "../confirm-dialog/open.injectable";
import { Menu, MenuItem } from "./menu";

import type { IconProps } from "@freelensapp/icon";
import type { TooltipDecoratorProps } from "@freelensapp/tooltip";
import type { StrictReactNode } from "@freelensapp/utilities";

import type { OpenConfirmDialog } from "../confirm-dialog/open.injectable";
import type { MenuProps } from "./menu";

export interface MenuOpenOptions {
  cursorPosition?: { x: number; y: number } | null;
  contextTarget?: HTMLElement | null;
}

export interface MenuControls {
  open: (options?: MenuOpenOptions) => void;
  close: () => void;
}
export interface MenuActionsProps extends Partial<MenuProps> {
  className?: string;
  toolbar?: boolean; // display menu as toolbar with icons
  autoCloseOnSelect?: boolean;
  triggerIcon?: string | (IconProps & TooltipDecoratorProps) | StrictReactNode;
  /**
   * @deprecated Provide your own remove `<MenuItem>` as part of the `children` passed to this component
   */
  removeConfirmationMessage?: StrictReactNode | (() => StrictReactNode);
  /**
   * @deprecated Provide your own update `<MenuItem>` as part of the `children` passed to this component
   */
  updateAction?: () => void | Promise<void>;
  /**
   * @deprecated Provide your own remove `<MenuItem>` as part of the `children` passed to this component
   */
  removeAction?: () => void | Promise<void>;
  onOpen?: () => void;
  id?: string;
  onMenuReady?: (controls: MenuControls) => void;
}

interface Dependencies {
  openConfirmDialog: OpenConfirmDialog;
}

@observer
class NonInjectedMenuActions extends React.Component<MenuActionsProps & Dependencies> {
  static defaultProps = {
    removeConfirmationMessage: "Remove item?",
  };

  @observable isOpen = !!this.props.toolbar;
  @observable openedViaCursor = false;
  @observable cursorPosition: { x: number; y: number } | null = null;
  @observable contextTarget: HTMLElement | null = null;

  constructor(props: MenuActionsProps & Dependencies) {
    super(props);
    makeObservable(this);
    autoBindReact(this);
  }

  componentDidMount(): void {
    this.props.onMenuReady?.({
      open: this.open,
      close: this.close,
    });

    disposeOnUnmount(this, [
      reaction(
        () => this.isOpen,
        (isOpen) => {
          if (isOpen) {
            this.props.onOpen?.();
          }
        },
        {
          fireImmediately: true,
        },
      ),
    ]);
  }

  componentWillUnmount(): void {
    this.props.onMenuReady?.({
      open: () => {},
      close: () => {},
    });
  }

  open = (options?: MenuOpenOptions) => {
    if (this.props.toolbar) return;
    this.isOpen = true;
    this.cursorPosition = options?.cursorPosition || null;
    this.openedViaCursor = !!options?.cursorPosition;
    this.contextTarget = options?.contextTarget || null;
  };

  close = () => {
    if (this.props.toolbar) return;
    this.isOpen = false;
    this.cursorPosition = null;
    this.openedViaCursor = false;
    this.contextTarget = null;
  };

  remove() {
    const { removeAction, openConfirmDialog } = this.props;
    let { removeConfirmationMessage } = this.props;

    if (typeof removeConfirmationMessage === "function") {
      removeConfirmationMessage = removeConfirmationMessage();
    }
    openConfirmDialog({
      ok: removeAction,
      labelOk: "Remove",
      message: <div>{removeConfirmationMessage}</div>,
    });
  }

  renderTriggerIcon() {
    const { triggerIcon = "more_vert", toolbar, "data-testid": dataTestId } = this.props;

    if (toolbar) {
      return null;
    }

    // Only show active state if opened via icon click, not right-click
    const isActive = this.isOpen && !this.openedViaCursor;

    if (isValidElement<HTMLElement>(triggerIcon)) {
      const className = cssNames(triggerIcon.props.className, { active: isActive });

      return React.cloneElement(triggerIcon, { id: this.props.id, className });
    }

    const iconProps: IconProps & TooltipDecoratorProps = {
      id: this.props.id,
      interactive: true,
      material: isString(triggerIcon) ? triggerIcon : undefined,
      active: isActive,
      ...(typeof triggerIcon === "object" ? triggerIcon : {}),
    };

    if (dataTestId) {
      iconProps["data-testid"] = `icon-for-${dataTestId}`;
    }

    if (iconProps.tooltip && this.isOpen) {
      delete iconProps.tooltip; // don't show tooltip for icon when menu is open
    }

    return <Icon {...iconProps} />;
  }

  render() {
    const {
      className,
      toolbar,
      autoCloseOnSelect,
      children,
      updateAction,
      removeAction,
      triggerIcon,
      removeConfirmationMessage,
      ...menuProps
    } = this.props;
    const autoClose = !toolbar;

    return (
      <>
        {this.renderTriggerIcon()}

        <Menu
          htmlFor={this.props.id}
          isOpen={this.isOpen}
          open={this.open}
          close={this.close}
          className={cssNames("MenuActions flex", className, {
            toolbar,
            gaps: toolbar, // add spacing for .flex
          })}
          animated={!toolbar}
          usePortal={autoClose}
          closeOnScroll={autoClose}
          closeOnClickItem={autoCloseOnSelect ?? autoClose}
          closeOnClickOutside={autoClose}
          cursorPosition={this.cursorPosition ?? undefined}
          contextTarget={this.contextTarget ?? undefined}
          {...menuProps}
        >
          {children}
          {updateAction && (
            <MenuItem onClick={updateAction}>
              <Icon material="edit" interactive={toolbar} tooltip="Edit" />
              <span className="title">Edit</span>
            </MenuItem>
          )}
          {removeAction && (
            <MenuItem onClick={this.remove} data-testid="menu-action-remove">
              <Icon material="delete" interactive={toolbar} tooltip="Delete" />
              <span className="title">Delete</span>
            </MenuItem>
          )}
        </Menu>
      </>
    );
  }
}

export const MenuActions = withInjectables<Dependencies, MenuActionsProps>(NonInjectedMenuActions, {
  getProps: (di, props) => ({
    id: di.inject(getRandomIdInjectionToken)(),
    openConfirmDialog: di.inject(openConfirmDialogInjectable),
    ...props,
  }),
});
