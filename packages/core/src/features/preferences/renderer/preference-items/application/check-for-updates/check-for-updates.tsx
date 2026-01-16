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

interface Dependencies {
  state: UserPreferencesState;
}

const NonInjectedCheckForUpdates = observer(({ state }: Dependencies) => (
  <section id="other">
    <SubTitle title="Check for Updates" />
    <Switch checked={state.checkForUpdates ?? true} onChange={() => (state.checkForUpdates = !state.checkForUpdates)}>
      Check for new version on startup
    </Switch>
  </section>
));

export const CheckForUpdates = withInjectables<Dependencies>(NonInjectedCheckForUpdates, {
  getProps: (di) => ({
    state: di.inject(userPreferencesStateInjectable),
  }),
});
