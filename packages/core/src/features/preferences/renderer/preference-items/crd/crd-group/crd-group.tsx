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

  // More interesting and informative hint in English
  const hint = "Define your custom CRD groups in JSON format. Example: { \"KEDA\": [\"eventing.keda.sh\", \"keda.sh\"] }";

  const jsonValidator = {
    validate: (value: string) => {
      if (!value.trim()) return true;
      try {
        JSON.parse(value);
        return true;
      } catch {
        return false;
      }
    },
    message: "The format must be valid JSON.",
  };

  return (
    <section>
      <SubTitle title="CRD Group" />
      <Input
        theme="round-black"
        placeholder='The json for example: { "KEDA": ["eventing.keda.sh","keda.sh"]}'
        value={crdGroup}
        onChange={(v) => setCrdGroup(v)}
        multiLine={true}
        rows={20}
        onBlur={() => (state.crdGroup = crdGroup)}
        validators={[jsonValidator]}
      />
      <small className="hint">{hint}</small>
    </section>
  );
});

export const CrdGroup = withInjectables<Dependencies>(NonInjectedCrdGroup, {
  getProps: (di) => ({
    state: di.inject(userPreferencesStateInjectable),
  }),
});
