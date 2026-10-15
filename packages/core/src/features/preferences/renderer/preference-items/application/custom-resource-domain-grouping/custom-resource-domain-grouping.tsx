/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import { SubTitle } from "../../../../../../renderer/components/layout/sub-title";
import { Switch } from "../../../../../../renderer/components/switch";
import userPreferencesStateInjectable from "../../../../../user-preferences/common/state.injectable";

import type { UserPreferencesState } from "../../../../../user-preferences/common/state.injectable";

interface Dependencies {
  state: UserPreferencesState;
}

const NonInjectedCustomResourceDomainGrouping = observer(({ state }: Dependencies) => (
  <section id="customResourceDomainGrouping">
    <SubTitle title="Custom Resource Groups" />
    <Switch
      checked={state.groupCustomResourcesByDomain}
      onChange={() => {
        state.groupCustomResourcesByDomain = !state.groupCustomResourcesByDomain;
      }}
    >
      Group by API domain
    </Switch>
  </section>
));

export const CustomResourceDomainGrouping = withInjectables<Dependencies>(NonInjectedCustomResourceDomainGrouping, {
  getProps: (di) => ({
    state: di.inject(userPreferencesStateInjectable),
  }),
});
