/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React from "react";
import { defaultAccentColor, defaultColorThemePreference } from "../../../../../../common/vars";
import { SubTitle } from "../../../../../../renderer/components/layout/sub-title";
import { Select } from "../../../../../../renderer/components/select";
import { accentColorPresets } from "../../../../../../renderer/themes/accent-colors";
import { lensThemeDeclarationInjectionToken } from "../../../../../../renderer/themes/declaration";
import userPreferencesStateInjectable from "../../../../../user-preferences/common/state.injectable";

import type { LensTheme } from "../../../../../../renderer/themes/lens-theme";
import type { UserPreferencesState } from "../../../../../user-preferences/common/state.injectable";

interface Dependencies {
  state: UserPreferencesState;
  themes: LensTheme[];
}

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

  const accentOptions = accentColorPresets.map((preset) => ({
    value: preset.value,
    label: preset.name,
  }));

  const currentAccent = state.customAccentColor || defaultAccentColor;

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
      <SubTitle title="Accent Color" />
      <Select
        id="accent-color-input"
        options={accentOptions}
        value={currentAccent}
        onChange={(value) => {
          const selected = value?.value ?? defaultAccentColor;

          state.customAccentColor = selected === defaultAccentColor ? "" : selected;
        }}
        themeName="lens"
        formatOptionLabel={(option) => (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{
                display: "inline-block",
                width: "14px",
                height: "14px",
                borderRadius: "50%",
                backgroundColor: option.value,
                border: "1px solid rgba(128,128,128,0.3)",
                flexShrink: 0,
              }}
            />
            <span>{option.label}</span>
          </div>
        )}
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
