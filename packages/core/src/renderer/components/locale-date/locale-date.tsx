/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { formatInTimeZone } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import userPreferencesStateInjectable from "../../../features/user-preferences/common/state.injectable";

import type { UserPreferencesState } from "../../../features/user-preferences/common/state.injectable";

export interface LocaleDateProps {
  date: string | Date;
}

interface Dependencies {
  state: UserPreferencesState;
}

const NonInjectedLocaleDate = observer(({ date, state }: LocaleDateProps & Dependencies) => (
  <>{formatInTimeZone(date, state.localeTimezone)}</>
));

export const LocaleDate = withInjectables<Dependencies, LocaleDateProps>(NonInjectedLocaleDate, {
  getProps: (di, props) => ({
    ...props,
    state: di.inject(userPreferencesStateInjectable),
  }),
});
