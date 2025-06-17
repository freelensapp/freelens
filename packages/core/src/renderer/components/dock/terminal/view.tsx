/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./terminal-window.scss";

import { cssNames } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import assert from "assert";
import type { IComputedValue } from "mobx";
import { disposeOnUnmount, observer } from "mobx-react";
import React from "react";
import activeThemeInjectable from "../../../themes/active.injectable";
import type { LensTheme } from "../../../themes/lens-theme";
import type { DockStore, DockTab } from "../dock/store";
import dockStoreInjectable from "../dock/store.injectable";
import type { TerminalStore } from "./store";
import terminalStoreInjectable from "./store.injectable";
import type { Terminal } from "./terminal";

export interface TerminalWindowProps {
  tab: DockTab;
}

interface Dependencies {
  dockStore: DockStore;
  terminalStore: TerminalStore;
  activeTheme: IComputedValue<LensTheme>;
}

@observer
class NonInjectedTerminalWindow extends React.Component<TerminalWindowProps & Dependencies> {
  public elem: HTMLElement | null = null;
  public terminal!: Terminal;

  componentDidMount() {
    this.props.terminalStore.connect(this.props.tab);
    const terminal = this.props.terminalStore.getTerminal(this.props.tab.id);

    assert(terminal, "Terminal must be created for tab before mounting");
    this.terminal = terminal;
    this.terminal.attachTo(this.elem!);

    disposeOnUnmount(this, [
      // refresh terminal available space (cols/rows) when <Dock/> resized
      this.props.dockStore.onResize(() => this.terminal.onResize(), {
        fireImmediately: true,
      }),
    ]);
  }

  componentDidUpdate(): void {
    this.terminal.detach();
    this.props.terminalStore.connect(this.props.tab);
    const terminal = this.props.terminalStore.getTerminal(this.props.tab.id);

    assert(terminal, "Terminal must be created for tab before mounting");
    this.terminal = terminal;
    this.terminal.attachTo(this.elem!);
  }

  componentWillUnmount(): void {
    this.terminal.detach();
  }

  render() {
    return (
      <div
        className={cssNames("TerminalWindow", this.props.activeTheme.get().type)}
        ref={(elem) => (this.elem = elem)}
      />
    );
  }
}

export const TerminalWindow = withInjectables<Dependencies, TerminalWindowProps>(NonInjectedTerminalWindow, {
  getProps: (di, props) => ({
    ...props,
    dockStore: di.inject(dockStoreInjectable),
    terminalStore: di.inject(terminalStoreInjectable),
    activeTheme: di.inject(activeThemeInjectable),
  }),
});
