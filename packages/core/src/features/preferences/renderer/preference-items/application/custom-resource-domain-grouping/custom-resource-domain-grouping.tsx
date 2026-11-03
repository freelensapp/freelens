/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import { Input, inputValidator } from "../../../../../../renderer/components/input";
import { SubTitle } from "../../../../../../renderer/components/layout/sub-title";
import { Switch } from "../../../../../../renderer/components/switch";
import userPreferencesStateInjectable from "../../../../../user-preferences/common/state.injectable";

import type { UserPreferencesState } from "../../../../../user-preferences/common/state.injectable";

interface Dependencies {
  state: UserPreferencesState;
}

const positiveIntegerValidator = inputValidator({
  condition: ({ type }) => type === "number",
  message: "Enter a whole number greater than or equal to 1",
  validate: (value) => Number.isInteger(Number(value)) && Number(value) >= 1,
});

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
    {state.groupCustomResourcesByDomain && (
      <div>
        <span id="custom-resource-group-root-depth-label">Top-level group depth (1 = io, 2 = cert-manager.io)</span>
        <Input
          id="custom-resource-group-root-depth"
          type="number"
          min={1}
          step={1}
          aria-labelledby="custom-resource-group-root-depth-label"
          validators={positiveIntegerValidator}
          defaultValue={state.customResourceGroupRootDepth.toString()}
          onChange={(value) => (state.customResourceGroupRootDepth = Number(value))}
        />
      </div>
    )}
  </section>
));

export const CustomResourceDomainGrouping = withInjectables<Dependencies>(NonInjectedCustomResourceDomainGrouping, {
  getProps: (di) => ({
    state: di.inject(userPreferencesStateInjectable),
  }),
});
