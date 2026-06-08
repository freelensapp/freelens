/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React from "react";
import { defaultColorThemePreference } from "../../../../../../common/vars";
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
    <input
      aria-label={`${label} color`}
      type="color"
      value={getCurrentThemeColor(colorName, state, themes)}
      onChange={(e) => setCustomThemeColor(colorName, e.target.value, state)}
      style={{ width: 32, height: 24, padding: 0, border: "1px solid var(--borderColor)", borderRadius: 4, cursor: "pointer" }}
    />
    <button
      type="button"
      onClick={() => resetCustomThemeColor(colorName, state)}
      disabled={!state.customThemeColors?.[colorName]}
      style={{
        background: "none",
        border: "none",
        color: state.customThemeColors?.[colorName] ? "var(--colorInfo)" : "var(--textColorDimmed)",
        cursor: state.customThemeColors?.[colorName] ? "pointer" : "default",
        fontSize: 12,
        padding: "2px 4px",
      }}
    >
      Reset
    </button>
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
        <summary style={{ cursor: "pointer", color: "var(--textColorSecondary)", fontSize: 13 }}>Advanced theme colors</summary>
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
      <button
        type="button"
        onClick={() => (state.customThemeColors = {})}
        disabled={Object.keys(state.customThemeColors ?? {}).length === 0}
        style={{
          marginTop: 12,
          background: "none",
          border: "none",
          color: Object.keys(state.customThemeColors ?? {}).length > 0 ? "var(--colorInfo)" : "var(--textColorDimmed)",
          cursor: Object.keys(state.customThemeColors ?? {}).length > 0 ? "pointer" : "default",
          fontSize: 13,
          padding: 0,
        }}
      >
        Reset all custom colors
      </button>
    </section>
  );
});

export const Theme = withInjectables<Dependencies>(NonInjectedTheme, {
  getProps: (di) => ({
    state: di.inject(userPreferencesStateInjectable),
    themes: di.injectMany(lensThemeDeclarationInjectionToken),
  }),
});
