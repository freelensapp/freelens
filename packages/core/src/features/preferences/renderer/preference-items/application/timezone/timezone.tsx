/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getAvailableTimezones } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import currentTimezoneInjectable from "../../../../../../common/vars/current-timezone.injectable";
import { SubTitle } from "../../../../../../renderer/components/layout/sub-title";
import { Select } from "../../../../../../renderer/components/select";
import userPreferencesStateInjectable from "../../../../../user-preferences/common/state.injectable";

import type { UserPreferencesState } from "../../../../../user-preferences/common/state.injectable";

interface Dependencies {
  state: UserPreferencesState;
  currentTimezone: string;
}

const timezoneOptions = getAvailableTimezones().map((timezone) => ({
  value: timezone,
  label: timezone.replace("_", " "),
}));

const NonInjectedTimezone = observer(({ state, currentTimezone }: Dependencies) => {
  // `Intl` enumerates canonical zones only, so a stored legacy alias (e.g.
  // "US/Pacific") may be missing from the list even though it still formats
  // correctly. Keep it selectable so the dropdown does not look empty.
  const options = timezoneOptions.some((option) => option.value === state.localeTimezone)
    ? timezoneOptions
    : [{ value: state.localeTimezone, label: state.localeTimezone.replace("_", " ") }, ...timezoneOptions];

  return (
    <section id="locale">
      <SubTitle title="Locale Timezone" />
      <Select
        id="timezone-input"
        options={options}
        value={state.localeTimezone}
        onChange={(value) => (state.localeTimezone = value?.value ?? currentTimezone)}
        themeName="lens"
      />
    </section>
  );
});

export const Timezone = withInjectables<Dependencies>(NonInjectedTimezone, {
  getProps: (di) => ({
    state: di.inject(userPreferencesStateInjectable),
    currentTimezone: di.inject(currentTimezoneInjectable),
  }),
});
