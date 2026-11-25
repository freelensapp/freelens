/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import { SubTitle } from "../../../../../../renderer/components/layout/sub-title";
import { Radio, RadioGroup } from "../../../../../../renderer/components/radio";
import { getAvailableVariants } from "../../../../../theme/files/common/resolve";
import findThemeInjectable from "../../../../../theme/files/renderer/find-theme.injectable";
import userPreferencesStateInjectable from "../../../../../user-preferences/common/state.injectable";

import type { FindTheme } from "../../../../../theme/files/renderer/find-theme.injectable";
import type { ThemeVariantPreference } from "../../../../../user-preferences/common/preferences-helpers";
import type { UserPreferencesState } from "../../../../../user-preferences/common/state.injectable";

interface Dependencies {
  state: UserPreferencesState;
  findTheme: FindTheme;
}

const NonInjectedThemeVariant = observer(({ state, findTheme }: Dependencies) => {
  const theme = findTheme(state.theme);
  const variants = getAvailableVariants(theme);
  const isSingleVariant = variants.length === 1;

  return (
    <section id="theme-variant">
      <SubTitle title="Variant" />
      <RadioGroup<ThemeVariantPreference>
        value={isSingleVariant ? variants[0] : state.themeVariant}
        onChange={(value) => (state.themeVariant = value)}
        disabled={isSingleVariant}
        asButtons
      >
        <Radio label="System" value="system" />
        <Radio label="Dark" value="dark" />
        <Radio label="Light" value="light" />
      </RadioGroup>
      <small className="hint">
        {isSingleVariant
          ? `${theme.spec.displayName} has only a ${variants[0]} variant.`
          : "System follows the light or dark mode of the operating system."}
      </small>
    </section>
  );
});

export const ThemeVariant = withInjectables<Dependencies>(NonInjectedThemeVariant, {
  getProps: (di) => ({
    state: di.inject(userPreferencesStateInjectable),
    findTheme: di.inject(findThemeInjectable),
  }),
});
