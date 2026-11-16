/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import { SubTitle } from "../../../../../../renderer/components/layout/sub-title";
import { Select } from "../../../../../../renderer/components/select";
import userPreferencesStateInjectable from "../../../../../user-preferences/common/state.injectable";
import { defaultZoom, zoomSteps } from "../../../../../zoom/common/zoom-steps";

import type { UserPreferencesState } from "../../../../../user-preferences/common/state.injectable";

interface Dependencies {
  state: UserPreferencesState;
}

const zoomOptions = zoomSteps.map((step) => ({
  value: step,
  label: `${step}%`,
}));

const NonInjectedZoom = observer(({ state }: Dependencies) => (
  <section id="zoom">
    <SubTitle title="Zoom" />
    <Select
      id="zoom-input"
      options={zoomOptions}
      value={state.zoom}
      onChange={(option) => (state.zoom = option?.value ?? defaultZoom)}
      themeName="lens"
    />
    <small className="hint">
      Applies to every window. Zoom In, Zoom Out and Actual Size in the View menu change it too.
    </small>
  </section>
));

export const Zoom = withInjectables<Dependencies>(NonInjectedZoom, {
  getProps: (di) => ({
    state: di.inject(userPreferencesStateInjectable),
  }),
});
