/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import { SubTitle } from "../../../../../../renderer/components/layout/sub-title";
import { Select } from "../../../../../../renderer/components/select";
import allLensThemesInjectable from "../../../../../../renderer/themes/all-themes.injectable";
import userPreferencesStateInjectable from "../../../../../user-preferences/common/state.injectable";

import type { IComputedValue } from "mobx";

import type { ThemeWithOrigin } from "../../../../../../renderer/themes/all-themes.injectable";
import type { UserPreferencesState } from "../../../../../user-preferences/common/state.injectable";

interface Dependencies {
  state: UserPreferencesState;
  themes: IComputedValue<Map<string, ThemeWithOrigin>>;
}

const NonInjectedTerminalTheme = observer(({ state, themes }: Dependencies) => {
  const themeOptions = [
    {
      value: "", // TODO: replace with a sentinel value that isn't string (and serialize it differently)
      label: "Match ProLens Theme",
    },
    ...[...themes.get().values()].map(({ theme, isCustom }) => ({
      value: theme.name,
      label: isCustom ? `${theme.name} (custom)` : theme.name,
    })),
  ];

  return (
    <section id="terminalTheme">
      <SubTitle title="Terminal theme" />
      <Select
        id="terminal-theme-input"
        themeName="lens"
        options={themeOptions}
        value={state.terminalTheme}
        onChange={(option) => (state.terminalTheme = option?.value ?? "")}
      />
    </section>
  );
});

export const TerminalTheme = withInjectables<Dependencies>(NonInjectedTerminalTheme, {
  getProps: (di) => ({
    state: di.inject(userPreferencesStateInjectable),
    themes: di.inject(allLensThemesInjectable),
  }),
});
