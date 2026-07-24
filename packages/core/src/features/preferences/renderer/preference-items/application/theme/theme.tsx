/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { action } from "mobx";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
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

const accentColorNames = [
  "primary",
  "blue",
  "buttonPrimaryBackground",
  "menuActiveBackground",
  "helmStableRepo",
];

const getDerivedColors = (accent: string): Record<string, string> => {
  const colors: Record<string, string> = {};

  for (const name of accentColorNames) {
    colors[name] = accent;
  }

  return colors;
};

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

  const currentAccent = state.customThemeColors?.primary ?? "";

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
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <input
            type="color"
            value={currentAccent || "#00a7a0"}
            onChange={action((e: React.ChangeEvent<HTMLInputElement>) => {
              state.customThemeColors = getDerivedColors(e.target.value);
            })}
            style={{ width: 40, height: 30, padding: 0, border: "none", cursor: "pointer" }}
          />
          {currentAccent ? (
            <button
              className="btn btn-link"
              onClick={action(() => {
                state.customThemeColors = {};
              })}
              type="button"
            >
              Reset
            </button>
          ) : null}
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
