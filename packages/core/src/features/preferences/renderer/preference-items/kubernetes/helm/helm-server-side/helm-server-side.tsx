/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React from "react";
import { SubTitle } from "../../../../../../../renderer/components/layout/sub-title";
import { Switch } from "../../../../../../../renderer/components/switch";
import userPreferencesStateInjectable from "../../../../../../user-preferences/common/state.injectable";

import type { UserPreferencesState } from "../../../../../../user-preferences/common/state.injectable";

interface Dependencies {
  state: UserPreferencesState;
}

const NonInjectedHelmServerSide = observer(({ state }: Dependencies) => (
  <section>
    <SubTitle title="Server-side apply" />
    <Switch checked={state.helmServerSide} onChange={() => (state.helmServerSide = !state.helmServerSide)}>
      Use server-side apply for Helm chart operations
    </Switch>
    <div className="hint">
      When enabled, Helm will use server-side apply (--server-side=true) for install and upgrade operations. This is
      always enabled when &quot;Force conflicts&quot; is checked.
    </div>
  </section>
));

export const HelmServerSide = withInjectables<Dependencies>(NonInjectedHelmServerSide, {
  getProps: (di) => ({
    state: di.inject(userPreferencesStateInjectable),
  }),
});
