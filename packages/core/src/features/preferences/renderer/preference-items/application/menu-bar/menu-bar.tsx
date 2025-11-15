/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React from "react";
import { SubTitle } from "../../../../../../renderer/components/layout/sub-title";
import { Switch } from "../../../../../../renderer/components/switch";
import userPreferencesStateInjectable from "../../../../../user-preferences/common/state.injectable";

import type { UserPreferencesState } from "../../../../../user-preferences/common/state.injectable";
import { ipcRenderer } from "electron";

interface Dependencies {
  state: UserPreferencesState;
}

const NonInjectedMenuBarSettings = observer(({ state }: Dependencies) => (
  <section id="menu">
    <SubTitle title="Menu-bar Settings" />
    <Switch checked={state.showTrayIcon} onChange={() => {
      state.showTrayIcon = !state.showTrayIcon;
      ipcRenderer.send("tray:set-visible", state.showTrayIcon);
    }}>
      Show tray icon in the menu bar
    </Switch>
  </section>
));

export const MenuBar = withInjectables<Dependencies>(NonInjectedMenuBarSettings, {
  getProps: (di) => ({
    state: di.inject(userPreferencesStateInjectable),
  }),
});
