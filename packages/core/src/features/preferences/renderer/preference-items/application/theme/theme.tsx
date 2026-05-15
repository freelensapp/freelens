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
  const accentColor = state.customAccentColor ?? "";
  const [accentColorInput, setAccentColorInput] = React.useState(accentColor);

  React.useEffect(() => {
    setAccentColorInput(accentColor);
  }, [accentColor]);

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
      <div className="mt-6">
        <SubTitle title="Accent color" />
        <div className="flex items-center gap-3">
          <input
            aria-label="Accent color"
            type="color"
            value={accentColor || "#00a7a0"}
            onChange={(event) => {
              setAccentColorInput(event.target.value);
              state.customAccentColor = event.target.value;
            }}
          />
          <Input
            aria-label="Accent color hex"
            theme="round-black"
            placeholder="#00a7a0"
            value={accentColorInput}
            onChange={(nextValue) => {
              const value = nextValue.trim();

              setAccentColorInput(value);

              if (!value) {
                state.customAccentColor = undefined;
              } else if (/^#[0-9a-fA-F]{6}$/.test(value)) {
                state.customAccentColor = value;
              }
            }}
          />
          <Button
            primary
            label="Reset"
            onClick={() => {
              setAccentColorInput("");
              state.customAccentColor = undefined;
            }}
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
  }),
});
