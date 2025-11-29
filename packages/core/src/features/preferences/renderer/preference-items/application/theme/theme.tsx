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
import { Button } from "../../../../../../renderer/components/button";
import lensThemesInjectable from "../../../../../../renderer/themes/themes.injectable";
import defaultLensThemeInjectable from "../../../../../../renderer/themes/default-theme.injectable";
import userPreferencesStateInjectable from "../../../../../user-preferences/common/state.injectable";
import navigateToRouteInjectable from "../../../../../../common/front-end-routing/navigate-to-route.injectable";
import { colorCustomizationRoute } from "../color-customization/color-customization-route.injectable";

import type { LensTheme } from "../../../../../../renderer/themes/lens-theme";
import type { UserPreferencesState } from "../../../../../user-preferences/common/state.injectable";
import type { NavigateToRoute } from "../../../../../../common/front-end-routing/navigate-to-route.injectable";

interface Dependencies {
  state: UserPreferencesState;
  defaultTheme: LensTheme;
  themes: Map<string, LensTheme>;
  navigateToRoute: NavigateToRoute;
}

const NonInjectedTheme = observer(({ state, themes, defaultTheme, navigateToRoute }: Dependencies) => {
  const themeList = Array.from(themes.values());

  const themeOptions = [
    {
      value: "system",
      label: "Sync with computer",
    },
    ...themeList.map((theme) => ({
      value: theme.name,
      label: theme.isCustom ? `${theme.name} (Custom)` : theme.name,
    })),
  ];

  const handleCustomizeColors = () => {
    navigateToRoute(colorCustomizationRoute);
  };

  return (
    <section id="appearance">
      <SubTitle title="Theme" />
      <Select
        id="theme-input"
        options={themeOptions}
        value={state.colorTheme}
        onChange={(value) => (state.colorTheme = value?.value ?? defaultTheme.name)}
        themeName="lens"
      />
      <div style={{ marginTop: "16px" }}>
        <Button
          primary
          label="Customize Colors..."
          onClick={handleCustomizeColors}
        />
      </div>
    </section>
  );
});

export const Theme = withInjectables<Dependencies>(NonInjectedTheme, {
  getProps: (di) => ({
    state: di.inject(userPreferencesStateInjectable),
    defaultTheme: di.inject(defaultLensThemeInjectable),
    themes: di.inject(lensThemesInjectable).get(),
    navigateToRoute: di.inject(navigateToRouteInjectable),
  }),
});
