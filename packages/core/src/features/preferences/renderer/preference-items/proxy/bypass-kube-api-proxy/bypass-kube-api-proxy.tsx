/**
 * Copyright (c) Freelens Authors. All rights reserved.
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

const NonInjectedBypassKubeApiProxy = observer(({ state }: Dependencies) => (
  <section className="small">
    <SubTitle title="Freelens Internal Proxy" />
    <Switch checked={state.bypassKubeApiProxy} onChange={() => (state.bypassKubeApiProxy = !state.bypassKubeApiProxy)}>
      Bypass Freelens Internal KubeApi Proxy
    </Switch>
    <small className="hint">
      This will make commands like kubectl and helm skip Freelens internal KubeApi proxy. Needed with some corporate
      proxies, bastion hosts (e.g. Teleport), or SOCKS5 tunnels that do certificate re-writing. Does not affect cluster
      communications!
    </small>
  </section>
));

export const BypassKubeApiProxy = withInjectables<Dependencies>(NonInjectedBypassKubeApiProxy, {
  getProps: (di) => ({
    state: di.inject(userPreferencesStateInjectable),
  }),
});
