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
import {
  CUSTOMIZABLE_THEME_COLOR_NAMES,
  toColorInputValue,
} from "../../../../../../renderer/themes/custom-theme-colors";
import { lensThemeDeclarationInjectionToken } from "../../../../../../renderer/themes/declaration";
import userPreferencesStateInjectable from "../../../../../user-preferences/common/state.injectable";
import styles from "./theme.module.scss";

import type { LensColorName, LensTheme } from "../../../../../../renderer/themes/lens-theme";
import type { UserPreferencesState } from "../../../../../user-preferences/common/state.injectable";

interface Dependencies {
  state: UserPreferencesState;
  themes: LensTheme[];
}

const colorLabels: Partial<Record<LensColorName, string>> = {
  primary: "Primary",
  buttonPrimaryBackground: "Primary button",
  menuActiveBackground: "Menu active",
  sidebarSubmenuActiveColor: "Sidebar active",
  sidebarActiveColor: "Sidebar item",
  layoutTabsActiveColor: "Active tab",
  textColorAccent: "Accent text",
  colorInfo: "Info",
  colorSuccess: "Success",
  colorWarning: "Warning",
  colorError: "Error",
};

const NonInjectedTheme = observer(({ state, themes }: Dependencies) => {
  const selectedTheme =
    themes.find((theme) => theme.name === state.colorTheme) ?? themes.find((theme) => theme.isDefault) ?? themes[0];
  const customThemeColors = state.customThemeColors ?? {};
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

  const setCustomColor = (name: LensColorName, value: string) => {
    state.customThemeColors = {
      ...customThemeColors,
      [name]: value,
    };
  };

  const resetCustomColor = (name: LensColorName) => {
    const { [name]: _removed, ...nextCustomThemeColors } = customThemeColors;

    state.customThemeColors = nextCustomThemeColors;
  };

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
      <div className={styles.colorGrid}>
        {CUSTOMIZABLE_THEME_COLOR_NAMES.map((name) => {
          const baseValue = selectedTheme?.colors[name] ?? "#000000";
          const inputValue = customThemeColors[name] ?? baseValue;

          return (
            <label className={styles.colorRow} key={name}>
              <span>{colorLabels[name] ?? name}</span>
              <input
                aria-label={colorLabels[name] ?? name}
                type="color"
                value={toColorInputValue(inputValue)}
                onChange={(event) => setCustomColor(name, event.target.value)}
              />
              <Button
                disabled={!customThemeColors[name]}
                label="Reset"
                onClick={() => resetCustomColor(name)}
              />
            </label>
          );
        })}
      </div>
      <Button
        disabled={!Object.keys(customThemeColors).length}
        label="Reset theme colors"
        onClick={() => (state.customThemeColors = {})}
      />
    </section>
  );
});

export const Theme = withInjectables<Dependencies>(NonInjectedTheme, {
  getProps: (di) => ({
    state: di.inject(userPreferencesStateInjectable),
    themes: di.injectMany(lensThemeDeclarationInjectionToken),
  }),
});
