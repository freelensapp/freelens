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
        options={themeOptions}
        value={state.colorTheme}
        onChange={(value) => (state.colorTheme = value?.value ?? defaultColorThemePreference)}
        themeName="lens"
      />

      <div style={{ marginTop: "16px" }}>
        <SubTitle title="Accent Color" />
        <label style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }}>
          <input
            type="color"
            value={state.customAccentColor || "#531cb3"}
            onChange={(e) => {
              state.customAccentColor = e.target.value;
            }}
            style={{
              width: "40px",
              height: "40px",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              padding: 0,
            }}
          />
          <span style={{ color: "var(--textColorSecondary)", fontSize: "13px" }}>
            {state.customAccentColor
              ? `Custom (${state.customAccentColor})`
              : "Default (click to customize)"}
          </span>
          {state.customAccentColor && (
            <button
              onClick={() => {
                state.customAccentColor = undefined;
              }}
              style={{
                background: "none",
                border: "1px solid var(--borderColor)",
                borderRadius: "4px",
                padding: "4px 8px",
                cursor: "pointer",
                fontSize: "12px",
                color: "var(--textColorSecondary)",
              }}
            >
              Reset
            </button>
          )}
        </label>
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
