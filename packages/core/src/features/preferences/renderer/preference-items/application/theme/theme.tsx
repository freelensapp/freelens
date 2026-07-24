/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Button } from "@freelensapp/button";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import { defaultColorThemePreference } from "../../../../../../common/vars";
import { Input } from "../../../../../../renderer/components/input";
import { SubTitle } from "../../../../../../renderer/components/layout/sub-title";
import { Select } from "../../../../../../renderer/components/select";
import { lensThemeDeclarationInjectionToken } from "../../../../../../renderer/themes/declaration";
import userPreferencesStateInjectable from "../../../../../user-preferences/common/state.injectable";

import type { LensTheme } from "../../../../../../renderer/themes/lens-theme";
import type { UserPreferencesState } from "../../../../../user-preferences/common/state.injectable";

interface Dependencies {
  state: UserPreferencesState;
  themes: LensTheme[];
}

const coreCustomThemeColorNames = [
  "primary",
  "textColorAccent",
  "mainBackground",
  "contentColor",
  "sidebarBackground",
  "colorInfo",
  "colorSuccess",
  "colorWarning",
  "colorError",
] as const;

type CoreCustomThemeColorName = (typeof coreCustomThemeColorNames)[number];

const customThemeColorLabels: Record<CoreCustomThemeColorName, string> = {
  primary: "Primary",
  textColorAccent: "Accent text",
  mainBackground: "Main background",
  contentColor: "Content background",
  sidebarBackground: "Sidebar background",
  colorInfo: "Info",
  colorSuccess: "Success",
  colorWarning: "Warning",
  colorError: "Error",
};

const getSelectedTheme = (state: UserPreferencesState, themes: LensTheme[]) =>
  themes.find((theme) => theme.name === state.colorTheme) ?? themes[0];

const getCurrentThemeColor = (colorName: string, state: UserPreferencesState, themes: LensTheme[]) => {
  const selectedTheme = getSelectedTheme(state, themes);

  return (
    state.customThemeColors?.[colorName] ?? selectedTheme?.colors[colorName as keyof LensTheme["colors"]] ?? "#000000"
  );
};

const getThemeColorNames = (state: UserPreferencesState, themes: LensTheme[]) =>
  Object.keys(getSelectedTheme(state, themes)?.colors ?? {});

const setCustomThemeColor = (colorName: string, color: string, state: UserPreferencesState) => {
  state.customThemeColors = {
    ...(state.customThemeColors ?? {}),
    [colorName]: color,
  };
};

const resetCustomThemeColor = (colorName: string, state: UserPreferencesState) => {
  const nextColors = { ...(state.customThemeColors ?? {}) };

  delete nextColors[colorName];
  state.customThemeColors = nextColors;
};

const renderColorControl = (colorName: string, label: string, state: UserPreferencesState, themes: LensTheme[]) => (
  <label key={colorName} style={{ alignItems: "center", display: "flex", gap: 8 }}>
    <span style={{ flex: 1 }}>{label}</span>
    <Input
      aria-label={`${label} color`}
      type="color"
      value={getCurrentThemeColor(colorName, state, themes)}
      onChange={(color) => setCustomThemeColor(colorName, color, state)}
    />
    <Button
      plain
      label="Reset"
      disabled={!state.customThemeColors?.[colorName]}
      onClick={() => resetCustomThemeColor(colorName, state)}
    />
  </label>
);

const NonInjectedTheme = observer(({ state, themes }: Dependencies) => {
  const advancedColorNames = getThemeColorNames(state, themes).filter(
    (colorName) => !coreCustomThemeColorNames.includes(colorName as CoreCustomThemeColorName),
  );
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
        options={themeOptions}
        value={state.colorTheme}
        onChange={(value) => (state.colorTheme = value?.value ?? defaultColorThemePreference)}
        themeName="lens"
      />
      <SubTitle title="Custom colors" />
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        {coreCustomThemeColorNames.map((colorName) =>
          renderColorControl(colorName, customThemeColorLabels[colorName], state, themes),
        )}
      </div>
      <details style={{ marginTop: 12 }}>
        <summary>Advanced theme colors</summary>
        <div
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            marginTop: 12,
          }}
        >
          {advancedColorNames.map((colorName) => renderColorControl(colorName, colorName, state, themes))}
        </div>
      </details>
      <Button
        plain
        label="Reset all custom colors"
        disabled={Object.keys(state.customThemeColors ?? {}).length === 0}
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
