/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import styles from "./dock-tab.module.scss";

import { Icon } from "@freelensapp/icon";
import { Tooltip, TooltipPosition } from "@freelensapp/tooltip";
import type { StrictReactNode } from "@freelensapp/utilities";
import { cssNames, isMiddleClick, prevDefault } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import autoBindReact from "auto-bind/react";
import { observable } from "mobx";
import { observer } from "mobx-react";
import React from "react";
import isMacInjectable from "../../../common/vars/is-mac.injectable";
import { Menu, MenuItem } from "../menu";
import type { TabProps } from "../tabs";
import { Tab } from "../tabs";
import type { DockStore, DockTab as DockTabModel } from "./dock/store";
import dockStoreInjectable from "./dock/store.injectable";

export interface DockTabProps extends TabProps<DockTabModel> {
  moreActions?: StrictReactNode;
}

interface Dependencies {
  dockStore: DockStore;
  isMac: boolean;
}

@observer
class NonInjectedDockTab extends React.Component<DockTabProps & Dependencies> {
  private readonly menuVisible = observable.box(false);

  constructor(props: DockTabProps & Dependencies) {
    super(props);
    autoBindReact(this);
  }

  close(id: string) {
    this.props.dockStore.closeTab(id);
  }

  renderMenu(tabId: string) {
    const { closeTab, closeAllTabs, closeOtherTabs, closeTabsToTheRight, tabs, getTabIndex } = this.props.dockStore;
    const closeAllDisabled = tabs.length === 1;
    const closeOtherDisabled = tabs.length === 1;
    const closeRightDisabled = getTabIndex(tabId) === tabs.length - 1;

    return (
      <Menu
        usePortal
        htmlFor={`tab-${tabId}`}
        className="DockTabMenu"
        isOpen={this.menuVisible.get()}
        open={() => this.menuVisible.set(true)}
        close={() => this.menuVisible.set(false)}
        toggleEvent="contextmenu"
      >
        <MenuItem onClick={() => closeTab(tabId)}>Close</MenuItem>
        <MenuItem onClick={() => closeAllTabs()} disabled={closeAllDisabled}>
          Close all tabs
        </MenuItem>
        <MenuItem onClick={() => closeOtherTabs(tabId)} disabled={closeOtherDisabled}>
          Close other tabs
        </MenuItem>
        <MenuItem onClick={() => closeTabsToTheRight(tabId)} disabled={closeRightDisabled}>
          Close tabs to the right
        </MenuItem>
      </Menu>
    );
  }

  render() {
    const { className, moreActions, dockStore, active, isMac, ...tabProps } = this.props;

    if (!tabProps.value) {
      return;
    }

    const { title, pinned, id } = tabProps.value;
    const close = prevDefault(() => this.close(id));

    return (
      <>
        <Tab
          {...tabProps}
          id={`tab-${id}`}
          className={cssNames(styles.DockTab, className, {
            [styles.pinned]: pinned,
          })}
          onContextMenu={() => this.menuVisible.set(true)}
          label={
            <div className="flex align-center" onAuxClick={isMiddleClick(close)}>
              <span className={styles.title}>{title}</span>
              {moreActions}
              {!pinned && (
                <div className={styles.close}>
                  <Icon
                    small
                    material="close"
                    tooltip={`Close ${this.props.isMac ? "⌘+W" : "Ctrl+W"}`}
                    onClick={close}
                    data-testid={`dock-tab-close-for-${id}`}
                  />
                </div>
              )}
              <Tooltip
                targetId={`tab-${id}`}
                preferredPositions={[TooltipPosition.TOP, TooltipPosition.TOP_LEFT]}
                style={{ transitionDelay: "700ms" }}
              >
                {title}
              </Tooltip>
            </div>
          }
          data-testid={`dock-tab-for-${id}`}
        />
        {this.renderMenu(id)}
      </>
    );
  }
}

export const DockTab = withInjectables<Dependencies, DockTabProps>(NonInjectedDockTab, {
  getProps: (di, props) => ({
    dockStore: di.inject(dockStoreInjectable),
    isMac: di.inject(isMacInjectable),
    ...props,
  }),
});
