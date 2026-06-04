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
import { lensColorNames } from "../../../../../../renderer/themes/custom-theme-colors";
import { lensThemeDeclarationInjectionToken } from "../../../../../../renderer/themes/declaration";
import userPreferencesStateInjectable from "../../../../../user-preferences/common/state.injectable";
import styles from "./theme.module.scss";

import type { LensColorName, LensTheme } from "../../../../../../renderer/themes/lens-theme";
import type { UserPreferencesState } from "../../../../../user-preferences/common/state.injectable";

interface Dependencies {
  state: UserPreferencesState;
  themes: LensTheme[];
}

const NonInjectedTheme = observer(({ state, themes }: Dependencies) => {
  const selectedTheme =
    themes.find((theme) => theme.name === state.colorTheme) ?? themes.find((theme) => theme.isDefault) ?? themes[0];
  const customThemeColors = state.customThemeColors ?? {};
  const hasCustomThemeColors = Object.keys(customThemeColors).length > 0;
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
        className={styles.themeInput}
        id="theme-input"
        options={themeOptions}
        value={state.colorTheme}
        onChange={(value) => (state.colorTheme = value?.value ?? defaultColorThemePreference)}
        themeName="lens"
      />

      <div className={styles.customColors}>
        <div className={styles.customColorsHeader}>
          <SubTitle title="Custom colors" />
          <Button
            hidden={!hasCustomThemeColors}
            label="Reset all"
            plain
            onClick={() => (state.customThemeColors = undefined)}
          />
        </div>

        <div className={styles.colorGrid}>
          {lensColorNames.map((colorName) => {
            const baseColor = selectedTheme?.colors[colorName] ?? "#000000";
            const value = customThemeColors[colorName] ?? baseColor;

            return (
              <label className={styles.colorRow} key={colorName}>
                <span className={styles.colorName} title={colorName}>
                  {colorName}
                </span>
                <input
                  aria-label={colorName}
                  className={styles.colorPicker}
                  type="color"
                  value={toColorInputValue(value)}
                  onChange={({ currentTarget }) => {
                    state.customThemeColors = {
                      ...customThemeColors,
                      [colorName]: currentTarget.value,
                    };
                  }}
                />
                <Button
                  hidden={!customThemeColors[colorName]}
                  label="Reset"
                  plain
                  onClick={() => resetCustomThemeColor(state, colorName)}
                />
              </label>
            );
          })}
        </div>
      </div>
    </section>
  );
});

const resetCustomThemeColor = (state: UserPreferencesState, colorName: LensColorName) => {
  const { [colorName]: _color, ...customThemeColors } = state.customThemeColors ?? {};

  state.customThemeColors = Object.keys(customThemeColors).length > 0 ? customThemeColors : undefined;
};

const colorInputValuePattern = /^#[0-9a-fA-F]{6}/;

const toColorInputValue = (value: string) => (colorInputValuePattern.test(value) ? value.slice(0, 7) : "#000000");

export const Theme = withInjectables<Dependencies>(NonInjectedTheme, {
  getProps: (di) => ({
    state: di.inject(userPreferencesStateInjectable),
    themes: di.injectMany(lensThemeDeclarationInjectionToken),
  }),
});
