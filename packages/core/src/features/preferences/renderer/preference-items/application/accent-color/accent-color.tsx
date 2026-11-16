/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import {
  ColorSwatch,
  ColorSwatchGroup,
  CustomColorSwatch,
} from "../../../../../../renderer/components/color-swatch/color-swatch";
import { SubTitle } from "../../../../../../renderer/components/layout/sub-title";
import { accentColorOptions, DEFAULT_ACCENT_COLOR } from "../../../../../../renderer/themes/accent-colors";
import userPreferencesStateInjectable from "../../../../../user-preferences/common/state.injectable";

import type { LensThemeType } from "../../../../../../renderer/themes/lens-theme";
import type { UserPreferencesState } from "../../../../../user-preferences/common/state.injectable";

interface Dependencies {
  state: UserPreferencesState;
}

const variants = [
  { type: "dark", name: "Dark", preference: "accentColorDark" },
  { type: "light", name: "Light", preference: "accentColorLight" },
] as const satisfies readonly {
  type: LensThemeType;
  name: string;
  preference: keyof UserPreferencesState;
}[];

const NonInjectedAccentColor = observer(({ state }: Dependencies) => (
  <section id="accent-color">
    <SubTitle title="Accent color" />
    <div className="flex flex-col gap-3">
      {variants.map(({ type, name, preference }) => {
        const current = state[preference] || DEFAULT_ACCENT_COLOR;
        const isCustom = !accentColorOptions.some((option) => option.value === current);

        return (
          <div key={type} className="flex items-center gap-4">
            <span className="w-10">{name}</span>
            <ColorSwatchGroup label={`Accent color of the ${type} theme`}>
              {accentColorOptions.map((option) => (
                <ColorSwatch
                  key={option.value}
                  color={option.value}
                  tooltip={option.label}
                  aria-label={option.label}
                  selected={current === option.value}
                  onClick={() => (state[preference] = option.value)}
                  data-testid={`accent-color-${type}-${option.label.toLowerCase()}`}
                />
              ))}
              <CustomColorSwatch
                value={isCustom ? current : undefined}
                onChange={(color) => (state[preference] = color)}
                data-testid={`accent-color-${type}-custom`}
              />
            </ColorSwatchGroup>
          </div>
        );
      })}
    </div>
  </section>
));

export const AccentColor = withInjectables<Dependencies>(NonInjectedAccentColor, {
  getProps: (di) => ({
    state: di.inject(userPreferencesStateInjectable),
  }),
});
