/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React from "react";
import { SubTitle } from "../../../../../../renderer/components/layout/sub-title";
import { Select } from "../../../../../../renderer/components/select";
import { lensThemeDeclarationInjectionToken } from "../../../../../../renderer/themes/declaration";
import defaultLensThemeInjectable from "../../../../../../renderer/themes/default-theme.injectable";
import userPreferencesStateInjectable from "../../../../../user-preferences/common/state.injectable";

import styles from "./theme.module.scss";

import type { LensTheme } from "../../../../../../renderer/themes/lens-theme";
import type { UserPreferencesState } from "../../../../../user-preferences/common/state.injectable";

interface Dependencies {
  state: UserPreferencesState;
  defaultTheme: LensTheme;
  themes: LensTheme[];
}

const NonInjectedTheme = observer(({ state, themes, defaultTheme }: Dependencies) => {
  const themeOptions = [
    {
      value: "system", // TODO: replace with a sentinel value that isn't string (and serialize it differently)
      label: "Sync with computer",
    },
    ...themes.map((theme) => ({
      value: theme.name,
      label: theme.name,
    })),
  ];

  const accentColorOptions = [
    { value: "#00a7a0", label: "Teal" },
    { value: "#4caf50", label: "Green" },
    { value: "#2196f3", label: "Blue" },
    { value: "#ff9800", label: "Orange" },
  ];

  const currentColor = state.customAccentColor || "#00a7a0";

  const ColorSwatch = ({ color }: { color: string }) => (
    <div style={{ backgroundColor: color, width: '20px', height: '20px', borderRadius: '2px' }} />
  );

  const ColorOption = ({ option }: { option: { value: string; label: string } }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <ColorSwatch color={option.value} />
      <span>{option.label}</span>
    </div>
  );

  return (
    <section id="appearance">
      <SubTitle title="Theme" />
      <div className={styles.selectRow}>
        <Select
          className={styles.themeSelect}
          id="theme-input"
          options={themeOptions}
          value={state.colorTheme}
          onChange={(value) => (state.colorTheme = value?.value ?? defaultTheme.name)}
          themeName="lens"
        />

        <Select
          className={styles.accentSelect}
          id="accent-color-select"
          options={accentColorOptions}
          value={currentColor}
          onChange={(value) => (state.customAccentColor = value?.value)}
          formatOptionLabel={(option) => <ColorOption option={option} />}
          themeName="lens"
        />
      </div>

      <div className={styles.colorPreview}>
        {currentColor !== "#00a7a0" && (
          <button
            onClick={() => (state.customAccentColor = undefined)}
            className={styles.resetButton}
            title="Reset to default color"
          >
            Reset to Default
          </button>
        )}
      </div>
    </section>
  );
});

export const Theme = withInjectables<Dependencies>(NonInjectedTheme, {
  getProps: (di) => ({
    state: di.inject(userPreferencesStateInjectable),
    defaultTheme: di.inject(defaultLensThemeInjectable),
    themes: di.injectMany(lensThemeDeclarationInjectionToken),
  }),
});
