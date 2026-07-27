/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "../../../renderer/components/dock/terminal/terminal-window.scss";

import { Icon } from "@freelensapp/icon";
import { cssNames } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import { useCallback, useEffect, useState } from "react";
import { Tab, Tabs } from "../../../renderer/components/tabs";
import { useResizeObserver } from "../../../renderer/hooks";
import activeThemeInjectable from "../../../renderer/themes/active.injectable";
import sessionStoreInjectable from "./session-store.injectable";
import tabsStoreInjectable from "./tabs-store.injectable";
import styles from "./terminal-page.module.scss";

import type { IComputedValue } from "mobx";

import type { LensTheme } from "../../../renderer/themes/lens-theme";
import type { StandaloneTerminalSessionStore } from "./session-store";
import type { StandaloneTerminalTabsStore } from "./tabs-store";

interface Dependencies {
  tabsStore: StandaloneTerminalTabsStore;
  sessionStore: StandaloneTerminalSessionStore;
  activeTheme: IComputedValue<LensTheme>;
}

const NonInjectedTerminalPage = observer(({ tabsStore, sessionStore, activeTheme }: Dependencies) => {
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  const selectedTab = tabsStore.selectedTab;
  const selectedTabId = selectedTab?.id;

  useEffect(() => {
    tabsStore.ensureTab();
  }, [tabsStore]);

  useEffect(() => {
    if (!selectedTabId || !host) {
      return;
    }

    sessionStore.connect(selectedTabId);

    const terminal = sessionStore.getTerminal(selectedTabId);

    terminal?.attachTo(host);

    // Only detached, never destroyed: the shell has to survive navigating away
    // from this page, and is torn down when its tab is closed.
    return () => terminal?.detach();
  }, [selectedTabId, host, sessionStore]);

  const onResize = useCallback(() => {
    if (selectedTabId) {
      sessionStore.getTerminal(selectedTabId)?.onResize();
    }
  }, [selectedTabId, sessionStore]);

  useResizeObserver(host, onResize);

  const closeTab = (tabId: string) => {
    sessionStore.destroy(tabId);
    tabsStore.close(tabId);
  };

  return (
    <div className={styles.terminalPage} data-testid="standalone-terminal-page">
      <div className={styles.header}>
        <Tabs
          className={styles.tabs}
          value={selectedTabId}
          onChange={(tabId: string) => tabsStore.select(tabId)}
          autoFocus
        >
          {tabsStore.tabs.map((tab) => (
            <Tab
              key={tab.id}
              value={tab.id}
              data-testid={`standalone-terminal-tab-${tab.id}`}
              label={
                <span className={styles.tabLabel}>
                  {tab.title}
                  <Icon
                    small
                    material="close"
                    className={styles.closeTab}
                    tooltip="Close terminal"
                    data-testid={`close-standalone-terminal-tab-${tab.id}`}
                    onClick={(event) => {
                      // the tab would otherwise be selected on its way out
                      event.stopPropagation();
                      closeTab(tab.id);
                    }}
                  />
                </span>
              }
            />
          ))}
        </Tabs>
        <Icon
          material="add"
          tooltip="New terminal"
          data-testid="add-standalone-terminal-tab"
          onClick={() => tabsStore.add()}
        />
      </div>
      <div
        className={cssNames(styles.host, "TerminalWindow", activeTheme.get().type)}
        data-testid="standalone-terminal-host"
        ref={setHost}
      />
    </div>
  );
});

export const TerminalPage = withInjectables<Dependencies>(NonInjectedTerminalPage, {
  getProps: (di, props) => ({
    tabsStore: di.inject(tabsStoreInjectable),
    sessionStore: di.inject(sessionStoreInjectable),
    activeTheme: di.inject(activeThemeInjectable),
    ...props,
  }),
});
