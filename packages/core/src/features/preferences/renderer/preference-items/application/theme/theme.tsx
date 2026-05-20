/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Button } from "@freelensapp/button";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React from "react";
import { defaultColorThemePreference } from "../../../../../../common/vars";
import { SubTitle } from "../../../../../../renderer/components/layout/sub-title";
import { Select } from "../../../../../../renderer/components/select";
import activeThemeInjectable from "../../../../../../renderer/themes/active.injectable";
import { lensThemeDeclarationInjectionToken } from "../../../../../../renderer/themes/declaration";
import userPreferencesStateInjectable from "../../../../../user-preferences/common/state.injectable";
import styles from "./theme.module.scss";

import type { IComputedValue } from "mobx";

import type { LensTheme } from "../../../../../../renderer/themes/lens-theme";
import type { UserPreferencesState } from "../../../../../user-preferences/common/state.injectable";

interface Dependencies {
  state: UserPreferencesState;
  themes: LensTheme[];
  activeTheme: IComputedValue<LensTheme>;
}

const NonInjectedTheme = observer(({ state, themes, activeTheme }: Dependencies) => {
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
  const accentColor = state.customAccentColor ?? activeTheme.get().colors.primary;

  return (
    <section id="appearance">
      <SubTitle title="Theme" />
      <Select
        id="theme-input"
        options={themeOptions}
        value={state.colorTheme}
        onChange={(value) => (state.colorTheme = value?.value ?? defaultColorThemePreference)}
        themeName="lens"
      />
      <div className={styles.accentColor}>
        <SubTitle title="Accent color" />
        <div className={styles.accentColorRow}>
          <input
            id="custom-accent-color-input"
            aria-label="Accent color"
            className={styles.accentColorPicker}
            type="color"
            value={accentColor}
            onChange={(event) => (state.customAccentColor = event.currentTarget.value)}
          />
          <span className={styles.accentColorValue}>{accentColor}</span>
          <Button
            plain
            label="Reset"
            disabled={!state.customAccentColor}
            onClick={() => (state.customAccentColor = undefined)}
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
    activeTheme: di.inject(activeThemeInjectable),
  }),
});
