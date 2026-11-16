/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { withInjectables } from "@ogre-tools/injectable-react";
import { runInAction } from "mobx";
import { observer } from "mobx-react";
import { SubTitle } from "../../../../../../renderer/components/layout/sub-title";
import { Select } from "../../../../../../renderer/components/select";
import { getAvailableVariants } from "../../../../../theme/files/common/resolve";
import availableThemesInjectable from "../../../../../theme/files/renderer/available-themes.injectable";
import userPreferencesStateInjectable from "../../../../../user-preferences/common/state.injectable";

import type { IComputedValue } from "mobx";

import type { AvailableTheme } from "../../../../../theme/files/renderer/available-themes.injectable";
import type { UserPreferencesState } from "../../../../../user-preferences/common/state.injectable";

interface Dependencies {
  state: UserPreferencesState;
  availableThemes: IComputedValue<AvailableTheme[]>;
}

const matchLensTheme = "";
const variantLabels = { dark: "Dark", light: "Light" } as const;

const NonInjectedTerminalTheme = observer(({ state, availableThemes }: Dependencies) => {
  const themeOptions = [
    {
      value: matchLensTheme,
      label: "Match Freelens Theme",
    },
    ...availableThemes.get().flatMap(({ theme }) => {
      const variants = getAvailableVariants(theme);

      return variants.map((variant) => ({
        value: `${theme.metadata.name}:${variant}`,
        label: variants.length > 1 ? `${theme.spec.displayName} (${variantLabels[variant]})` : theme.spec.displayName,
      }));
    }),
  ];
  const value = state.terminalTheme ? `${state.terminalTheme}:${state.terminalThemeVariant}` : matchLensTheme;
  // A theme with a single variant is listed once, under the variant it has.
  const selected =
    themeOptions.find((option) => option.value === value) ??
    themeOptions.find((option) => state.terminalTheme && option.value.startsWith(`${state.terminalTheme}:`));

  return (
    <section id="terminalTheme">
      <SubTitle title="Terminal theme" />
      <Select
        id="terminal-theme-input"
        themeName="lens"
        options={themeOptions}
        value={selected?.value ?? matchLensTheme}
        onChange={(option) =>
          runInAction(() => {
            const [name = "", variant] = (option?.value ?? matchLensTheme).split(":");

            state.terminalTheme = name;
            state.terminalThemeVariant = variant === "light" ? "light" : "dark";
          })
        }
      />
    </section>
  );
});

export const TerminalTheme = withInjectables<Dependencies>(NonInjectedTerminalTheme, {
  getProps: (di) => ({
    state: di.inject(userPreferencesStateInjectable),
    availableThemes: di.inject(availableThemesInjectable),
  }),
});
