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

  // Dynamic hint based on input value
  let hint = "Proxy is used only for non-cluster communication.";
  try {
    const parsed = JSON.parse(crdGroup);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      Object.values(parsed).every(
        v => Array.isArray(v) && v.every(item => typeof item === "string")
      )
    ) {
      hint = "Valid JSON object. Example: { \"KEDA\": [\"eventing.keda.sh\", \"keda.sh\"] }";
    } else {
      hint = "JSON must be an object with string array values. Example: { \"KEDA\": [\"eventing.keda.sh\", \"keda.sh\"] }";
    }
  } catch {
    if (crdGroup.trim() !== "") {
      hint = "Invalid JSON format. Example: { \"KEDA\": [\"eventing.keda.sh\", \"keda.sh\"] }";
    }
  }

  return (
    <section>
      <SubTitle title="CRD Group" />
      <Input
        theme="round-black"
        placeholder='The json for example: { "KEDA": ["eventing.keda.sh","keda.sh"]}'
        value={crdGroup}
        onChange={(v) => setCrdGroup(v)}
        onBlur={() => (state.crdGroup = crdGroup)}
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
