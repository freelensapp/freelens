/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React from "react";
import { Input } from "../../../../../../renderer/components/input";
import { SubTitle } from "../../../../../../renderer/components/layout/sub-title";
import type { UserPreferencesState } from "../../../../../user-preferences/common/state.injectable";
import userPreferencesStateInjectable from "../../../../../user-preferences/common/state.injectable";

interface Dependencies {
  state: UserPreferencesState;
}

const NonInjectedCrdGroup = observer(({ state }: Dependencies) => {
  const [crdGroup, setCrdGroup] = React.useState(state.crdGroup || "");

  return (
    <section>
      <SubTitle title="CRD Group" />
      <Input
        theme="round-black"
        placeholder='The json for example: {\"group\": \"acme.org\", \"version\": \"v1\"}'
        value={crdGroup}
        onChange={(v) => setCrdGroup(v)}
        onBlur={() => (state.crdGroup = crdGroup)}
      />
      <small className="hint">Proxy is used only for non-cluster communication.</small>
    </section>
  );
});

export const CrdGroup = withInjectables<Dependencies>(NonInjectedCrdGroup, {
  getProps: (di) => ({
    state: di.inject(userPreferencesStateInjectable),
  }),
});
