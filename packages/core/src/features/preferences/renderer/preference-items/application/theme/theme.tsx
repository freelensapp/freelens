/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { withInjectables } from "@ogre-tools/injectable-react";
import { runInAction } from "mobx";
import { observer } from "mobx-react";
import React from "react";
import { defaultColorThemePreference } from "../../../../../../common/vars";
import { Input } from "../../../../../../renderer/components/input";
import { SubTitle } from "../../../../../../renderer/components/layout/sub-title";
import { Select } from "../../../../../../renderer/components/select";
import { lensThemeDeclarationInjectionToken } from "../../../../../../renderer/themes/declaration";
import userPreferencesStateInjectable from "../../../../../user-preferences/common/state.injectable";
import applyLensThemeInjectable from "../../../../../../renderer/themes/apply-lens-theme.injectable";
import activeThemeInjectable from "../../../../../../renderer/themes/active.injectable";

import type { LensTheme } from "../../../../../../renderer/themes/lens-theme";
import type { UserPreferencesState } from "../../../../../user-preferences/common/state.injectable";
import type { ApplyLensTheme } from "../../../../../../renderer/themes/apply-lens-theme.injectable";
import type { IComputedValue } from "mobx";

interface Dependencies {
  state: UserPreferencesState;
  themes: LensTheme[];
  applyLensTheme: ApplyLensTheme;
  activeTheme: IComputedValue<LensTheme>;
}

const NonInjectedTheme = observer(({ state, themes, applyLensTheme, activeTheme }: Dependencies) => {
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

  const updateColor = (name: string, value: string) => {
    runInAction(() => {
      state.customColors[name] = value;
      applyLensTheme(activeTheme.get());
    });
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

      <div className="mt-4">
        <SubTitle title="Custom Colors" />
        <div className="flex column flow">
          <div className="flex align-center flow">
            <div className="w-32">Primary Color</div>
            <Input
              theme="round-black"
              type="color"
              value={state.customColors.primary || "#00a7a0"}
              onChange={(val) => updateColor("primary", val)}
              className="w-16 h-8"
            />
            <Input
              theme="round-black"
              value={state.customColors.primary || "#00a7a0"}
              onChange={(val) => updateColor("primary", val)}
              placeholder="#00a7a0"
            />
          </div>
          <div className="flex align-center flow">
            <div className="w-32">Accent Color</div>
            <Input
              theme="round-black"
              type="color"
              value={state.customColors.textColorAccent || "#ffffff"}
              onChange={(val) => updateColor("textColorAccent", val)}
              className="w-16 h-8"
            />
            <Input
              theme="round-black"
              value={state.customColors.textColorAccent || "#ffffff"}
              onChange={(val) => updateColor("textColorAccent", val)}
              placeholder="#ffffff"
            />
          </div>
          <button
            className="p-2 mt-2 text-sm text-center border rounded cursor-pointer border-borderColor hover:bg-sidebarItemHoverBackground"
            onClick={() => {
              runInAction(() => {
                state.customColors = {};
                applyLensTheme(activeTheme.get());
              });
            }}
          >
            Reset to Default Colors
          </button>
        </div>
      </div>
    </section>
  );
});

export const Theme = withInjectables<Dependencies>(NonInjectedTheme, {
  getProps: (di) => ({
    state: di.inject(userPreferencesStateInjectable),
    themes: di.injectMany(lensThemeDeclarationInjectionToken),
    applyLensTheme: di.inject(applyLensThemeInjectable),
    activeTheme: di.inject(activeThemeInjectable),
  }),
});
