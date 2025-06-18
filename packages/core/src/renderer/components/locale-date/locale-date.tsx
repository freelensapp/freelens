/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import moment from "moment-timezone";
import React from "react";
import userPreferencesStateInjectable from "../../../features/user-preferences/common/state.injectable";

import type { UserPreferencesState } from "../../../features/user-preferences/common/state.injectable";

export interface LocaleDateProps {
  date: string;
}

interface Dependencies {
  state: UserPreferencesState;
}

const NonInjectedLocaleDate = observer(({ date, state }: LocaleDateProps & Dependencies) => (
  <>{`${moment.tz(date, state.localeTimezone).format()}`}</>
));

export const LocaleDate = withInjectables<Dependencies, LocaleDateProps>(NonInjectedLocaleDate, {
  getProps: (di, props) => ({
    ...props,
    state: di.inject(userPreferencesStateInjectable),
  }),
});
