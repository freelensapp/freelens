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

const NonInjectedDeleteProtection = observer(({ state }: Dependencies) => (
  <section id="other">
    <SubTitle title="Delete Protection" />
    <Switch checked={state.allowDelete ?? true} onChange={() => (state.allowDelete = !state.allowDelete)}>
      Allow deleting Kubernetes resources
    </Switch>
  </section>
));

export const DeleteProtection = withInjectables<Dependencies>(NonInjectedDeleteProtection, {
  getProps: (di) => ({
    state: di.inject(userPreferencesStateInjectable),
  }),
});
