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
  activeTheme: IComputedValue<LensTheme>;
  state: UserPreferencesState;
  themes: LensTheme[];
}

const customColorValuePattern = /^#[0-9a-f]{6}$/i;

const updateThemeColorOverride = (state: UserPreferencesState, colorName: string, value: string) => {
  if (!customColorValuePattern.test(value)) {
    return;
  }

  state.themeColorOverrides = {
    ...(state.themeColorOverrides ?? {}),
    [colorName]: value.toLowerCase(),
  };
};

const resetThemeColorOverride = (state: UserPreferencesState, colorName: string) => {
  const { [colorName]: _removed, ...themeColorOverrides } = state.themeColorOverrides ?? {};

  state.themeColorOverrides = themeColorOverrides;
};

const NonInjectedTheme = observer(({ activeTheme, state, themes }: Dependencies) => {
  const [customColorsOpen, setCustomColorsOpen] = React.useState(false);
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
  const activeThemeColors = activeTheme.get().colors;
  const themeColorOverrides = state.themeColorOverrides ?? {};
  const customColorNames = (Object.keys(activeThemeColors) as (keyof LensTheme["colors"])[]).filter((colorName) =>
    customColorValuePattern.test(activeThemeColors[colorName]),
  );
  const customColorCount = Object.keys(themeColorOverrides).length;

  React.useEffect(() => {
    if (customColorCount > 0) {
      setCustomColorsOpen(true);
    }
  }, [customColorCount]);

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
      <details className={styles.customColors} open={customColorsOpen}>
        <summary
          onClick={(event) => {
            event.preventDefault();
            setCustomColorsOpen((isOpen) => !isOpen);
          }}
        >
          <span>Custom colors</span>
          {customColorCount > 0 && <span className={styles.customColorCount}>{customColorCount}</span>}
        </summary>
        <div className={styles.customColorGrid}>
          {customColorNames.map((colorName) => {
            const value = themeColorOverrides[colorName] ?? activeThemeColors[colorName];

            return (
              <div className={styles.customColorRow} key={colorName}>
                <input
                  aria-label={colorName}
                  className={styles.customColorInput}
                  type="color"
                  value={value}
                  onChange={(event) => updateThemeColorOverride(state, colorName, event.currentTarget.value)}
                />
                <code>{colorName}</code>
                <Button
                  disabled={!themeColorOverrides[colorName]}
                  label="Reset"
                  onClick={() => resetThemeColorOverride(state, colorName)}
                  plain
                />
              </div>
            );
          })}
        </div>
        <Button
          disabled={customColorCount === 0}
          label="Reset all"
          onClick={() => {
            state.themeColorOverrides = {};
          }}
          outlined
        />
      </details>
    </section>
  );
});

export const Theme = withInjectables<Dependencies>(NonInjectedTheme, {
  getProps: (di) => ({
    activeTheme: di.inject(activeThemeInjectable),
    state: di.inject(userPreferencesStateInjectable),
    themes: di.injectMany(lensThemeDeclarationInjectionToken),
  }),
});
