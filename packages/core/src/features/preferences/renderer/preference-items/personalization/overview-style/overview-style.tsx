/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import { SubTitle } from "../../../../../../renderer/components/layout/sub-title";
import { Radio, RadioGroup } from "../../../../../../renderer/components/radio";
import overviewStyleInjectable from "../../../../../user-preferences/common/overview-style.injectable";
import userPreferencesStateInjectable from "../../../../../user-preferences/common/state.injectable";

import type { IComputedValue } from "mobx";

import type { OverviewStylePreference } from "../../../../../user-preferences/common/preferences-helpers";
import type { UserPreferencesState } from "../../../../../user-preferences/common/state.injectable";

interface Dependencies {
  state: UserPreferencesState;
  overviewStyle: IComputedValue<OverviewStylePreference>;
}

const NonInjectedOverviewStyle = observer(({ state, overviewStyle }: Dependencies) => (
  <section id="overview-style">
    <SubTitle title="Overview style" />
    <RadioGroup<OverviewStylePreference>
      value={overviewStyle.get()}
      onChange={(value) => (state.overviewStyle = value)}
      asButtons
    >
      <Radio label="Cards" value="cards" />
      <Radio label="Charts" value="charts" />
    </RadioGroup>
    <small className="hint">
      How the cluster and workloads overviews show their numbers: as cards, or as ring and pie charts.
    </small>
  </section>
));

export const OverviewStyle = withInjectables<Dependencies>(NonInjectedOverviewStyle, {
  getProps: (di) => ({
    state: di.inject(userPreferencesStateInjectable),
    overviewStyle: di.inject(overviewStyleInjectable),
  }),
});
