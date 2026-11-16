/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import { defaultColorThemePreference } from "../../../../../../common/vars";
import { SubTitle } from "../../../../../../renderer/components/layout/sub-title";
import { Select } from "../../../../../../renderer/components/select";
import { accentColorOptions, DEFAULT_ACCENT_COLOR } from "../../../../../../renderer/themes/accent-colors";
import { lensThemeDeclarationInjectionToken } from "../../../../../../renderer/themes/declaration";
import userPreferencesStateInjectable from "../../../../../user-preferences/common/state.injectable";
import styles from "./theme.module.scss";

import type { AccentColorOption } from "../../../../../../renderer/themes/accent-colors";
import type { LensTheme } from "../../../../../../renderer/themes/lens-theme";
import type { UserPreferencesState } from "../../../../../user-preferences/common/state.injectable";

interface Dependencies {
  state: UserPreferencesState;
  themes: LensTheme[];
}

const ColorSwatch = ({ color }: { color: string }) => (
  <div className={styles.colorSwatch} style={{ backgroundColor: color }} />
);

const ColorOption = ({ option }: { option: AccentColorOption }) => (
  <div className={styles.colorOption}>
    <ColorSwatch color={option.value} />
    <span>{option.label}</span>
  </div>
);

const NonInjectedTheme = observer(({ state, themes }: Dependencies) => {
  const themeOptions = [
    {
      value: defaultColorThemePreference,
      label: "Sync with computer",
    },
    ...themes.map((theme) => ({
      value: theme.name,
      label: theme.name,
    })),
  ];

  return (
    <section id="appearance">
      <SubTitle title="Theme" />
      <Select
        id="theme-input"
        aria-label="Theme"
        options={themeOptions}
        value={state.colorTheme}
        onChange={(value) => (state.colorTheme = value?.value ?? defaultColorThemePreference)}
        themeName="lens"
      />

      <SubTitle title="Accent color" />
      <div className={styles.accentRow}>
        <div className={styles.accentColumn}>
          <span>Dark</span>
          <Select
            id="accent-color-dark-input"
            aria-label="Accent color of the dark theme"
            options={accentColorOptions}
            value={state.accentColorDark || DEFAULT_ACCENT_COLOR}
            onChange={(value) => (state.accentColorDark = value?.value)}
            formatOptionLabel={(option) => <ColorOption option={option} />}
            themeName="lens"
          />
        </div>
        <div className={styles.accentColumn}>
          <span>Light</span>
          <Select
            id="accent-color-light-input"
            aria-label="Accent color of the light theme"
            options={accentColorOptions}
            value={state.accentColorLight || DEFAULT_ACCENT_COLOR}
            onChange={(value) => (state.accentColorLight = value?.value)}
            formatOptionLabel={(option) => <ColorOption option={option} />}
            themeName="lens"
          />
        </div>
      </div>
    </section>
  );
});

export const Theme = withInjectables<Dependencies>(NonInjectedTheme, {
  getProps: (di) => ({
    state: di.inject(userPreferencesStateInjectable),
    themes: di.injectMany(lensThemeDeclarationInjectionToken),
  }),
});
