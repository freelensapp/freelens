/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Icon } from "@freelensapp/icon";
import type { ShowNotification } from "@freelensapp/notifications";
import { showErrorNotificationInjectable } from "@freelensapp/notifications";
import { cssNames } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import autoBindReact from "auto-bind/react";
import React from "react";
import type { PortForwardItem, PortForwardStore } from "../../port-forward";
import type { OpenPortForward } from "../../port-forward/open-port-forward.injectable";
import openPortForwardInjectable from "../../port-forward/open-port-forward.injectable";
import portForwardDialogModelInjectable from "../../port-forward/port-forward-dialog-model/port-forward-dialog-model.injectable";
import portForwardStoreInjectable from "../../port-forward/port-forward-store/port-forward-store.injectable";
import { MenuItem } from "../menu";
import type { MenuActionsProps } from "../menu/menu-actions";
import { MenuActions } from "../menu/menu-actions";

export interface PortForwardMenuProps extends MenuActionsProps {
  portForward: PortForwardItem;
  hideDetails?(): void;
}

interface Dependencies {
  portForwardStore: PortForwardStore;
  openPortForwardDialog: (item: PortForwardItem) => void;
  openPortForward: OpenPortForward;
  showErrorNotification: ShowNotification;
}

class NonInjectedPortForwardMenu<Props extends PortForwardMenuProps & Dependencies> extends React.Component<Props> {
  constructor(props: Props) {
    super(props);
    autoBindReact(this);
  }

  remove() {
    const { portForward, showErrorNotification } = this.props;

    try {
      this.portForwardStore.remove(portForward);
    } catch (error) {
      showErrorNotification(
        `Error occurred stopping the port-forward from port ${portForward.forwardPort}. The port-forward may still be active.`,
      );
    }
  }

  get portForwardStore() {
    return this.props.portForwardStore;
  }

  private startPortForwarding = async () => {
    const { portForward, showErrorNotification } = this.props;

    const pf = await this.portForwardStore.start(portForward);

    if (pf.status === "Disabled") {
      const { name, kind, forwardPort } = portForward;

      showErrorNotification(
        `Error occurred starting port-forward, the local port ${forwardPort} may not be available or the ${kind} ${name} may not be reachable`,
      );
    }
  };

  renderStartStopMenuItem() {
    const { portForward, toolbar } = this.props;

    if (portForward.status === "Active") {
      return (
        <MenuItem onClick={() => this.portForwardStore.stop(portForward)}>
          <Icon material="stop" tooltip="Stop port-forward" interactive={toolbar} />
          <span className="title">Stop</span>
        </MenuItem>
      );
    }

    return (
      <MenuItem onClick={this.startPortForwarding}>
        <Icon material="play_arrow" tooltip="Start port-forward" interactive={toolbar} />
        <span className="title">Start</span>
      </MenuItem>
    );
  }

  renderContent() {
    const { portForward, toolbar } = this.props;

    if (!portForward) return null;

    return (
      <>
        {portForward.status === "Active" && (
          <MenuItem onClick={() => this.props.openPortForward(portForward)}>
            <Icon material="open_in_browser" interactive={toolbar} tooltip="Open in browser" />
            <span className="title">Open</span>
          </MenuItem>
        )}
        <MenuItem onClick={() => this.props.openPortForwardDialog(portForward)}>
          <Icon material="edit" tooltip="Change port or protocol" interactive={toolbar} />
          <span className="title">Edit</span>
        </MenuItem>
        {this.renderStartStopMenuItem()}
      </>
    );
  }

  render() {
    const { className, ...menuProps } = this.props;

    return (
      <MenuActions
        id={`menu-actions-for-port-forward-menu-for-${this.props.portForward.getId()}`}
        {...menuProps}
        className={cssNames("PortForwardMenu", className)}
        removeAction={this.remove}
      >
        {this.renderContent()}
      </MenuActions>
    );
  }
}

export const PortForwardMenu = withInjectables<Dependencies, PortForwardMenuProps>(NonInjectedPortForwardMenu, {
  getProps: (di, props) => ({
    ...props,
    portForwardStore: di.inject(portForwardStoreInjectable),
    openPortForwardDialog: di.inject(portForwardDialogModelInjectable).open,
    openPortForward: di.inject(openPortForwardInjectable),
    showErrorNotification: di.inject(showErrorNotificationInjectable),
  }),
});
