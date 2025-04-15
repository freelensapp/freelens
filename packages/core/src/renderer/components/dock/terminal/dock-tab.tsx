/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./terminal-dock-tab.scss";
import { Icon } from "@freelensapp/icon";
import { cssNames } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import autoBindReact from "auto-bind/react";
import { reaction } from "mobx";
import { disposeOnUnmount, observer } from "mobx-react";
import React from "react";
import type { DockTabProps } from "../dock-tab";
import { DockTab } from "../dock-tab";
import type { DockStore } from "../dock/store";
import dockStoreInjectable from "../dock/store.injectable";
import type { TerminalStore } from "./store";
import terminalStoreInjectable from "./store.injectable";

export interface TerminalTabProps extends DockTabProps {}

interface Dependencies {
  dockStore: DockStore;
  terminalStore: TerminalStore;
}

@observer
class NonInjectedTerminalTab<Props extends TerminalTabProps & Dependencies> extends React.Component<Props> {
  constructor(props: Props) {
    super(props);
    autoBindReact(this);
  }

  componentDidMount() {
    disposeOnUnmount(this, [reaction(() => this.isDisconnected, this.close)]);
  }

  private close() {
    const { tabId } = this;

    if (tabId) {
      this.props.dockStore.closeTab(tabId);
    }
  }

  private get tabId() {
    return this.props.value?.id;
  }

  private get isDisconnected() {
    const { tabId } = this;

    return tabId ? this.props.terminalStore.isDisconnected(tabId) : false;
  }

  private reconnect() {
    const { tabId } = this;

    if (tabId) {
      this.props.terminalStore.reconnect(tabId);
    }
  }

  render() {
    const className = cssNames("TerminalTab", this.props.className, {
      disconnected: this.isDisconnected,
    });

    const { dockStore, terminalStore, ...tabProps } = this.props;

    return (
      <DockTab
        {...tabProps}
        className={className}
        icon={<Icon material="terminal" />}
        moreActions={
          this.isDisconnected && (
            <Icon
              small
              material="refresh"
              className="restart-icon"
              tooltip="Restart session"
              onClick={this.reconnect}
            />
          )
        }
      />
    );
  }
}

export const TerminalTab = withInjectables<Dependencies, TerminalTabProps>(NonInjectedTerminalTab, {
  getProps: (di, props) => ({
    dockStore: di.inject(dockStoreInjectable),
    terminalStore: di.inject(terminalStoreInjectable),
    ...props,
  }),
});
