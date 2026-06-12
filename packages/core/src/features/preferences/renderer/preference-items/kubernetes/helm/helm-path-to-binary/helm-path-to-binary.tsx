/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React, { useState } from "react";
import bundledBinaryPathInjectable from "../../../../../../../common/utils/bundled-binary-path.injectable";
import { Input, InputValidators } from "../../../../../../../renderer/components/input";
import { SubTitle } from "../../../../../../../renderer/components/layout/sub-title";
import userPreferencesStateInjectable from "../../../../../../user-preferences/common/state.injectable";

import type { UserPreferencesState } from "../../../../../../user-preferences/common/state.injectable";

interface Dependencies {
  state: UserPreferencesState;
  defaultPathForHelmBinary: string;
}

const NonInjectedHelmPathToBinary = observer(({ state, defaultPathForHelmBinary }: Dependencies) => {
  const [binariesPath, setBinariesPath] = useState(state.helmBinariesPath || "");
  const pathValidator = binariesPath ? InputValidators.isPath : undefined;

  const save = () => {
    state.helmBinariesPath = binariesPath;
  };

  return (
    <section>
      <SubTitle title="Path to helm binary" />
      <Input
        theme="round-black"
        placeholder={defaultPathForHelmBinary}
        value={binariesPath}
        validators={pathValidator}
        onChange={setBinariesPath}
        onBlur={save}
      />
      <div className="hint">The path to the helm binary. Defaults to the bundled version.</div>
    </section>
  );
});

export const HelmPathToBinary = withInjectables<Dependencies>(NonInjectedHelmPathToBinary, {
  getProps: (di) => ({
    defaultPathForHelmBinary: di.inject(bundledBinaryPathInjectable, "helm"),
    state: di.inject(userPreferencesStateInjectable),
  }),
});
