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
import { accentColorOptions, getTextColorOnAccent } from "../../../../../../renderer/themes/accent-colors";
import findThemeInjectable from "../../../../../theme/files/renderer/find-theme.injectable";
import resolveThemeInjectable from "../../../../../theme/files/renderer/resolve-theme.injectable";
import userPreferencesStateInjectable from "../../../../../user-preferences/common/state.injectable";

import type { LensThemeType } from "../../../../../../renderer/themes/lens-theme";
import type { FindTheme } from "../../../../../theme/files/renderer/find-theme.injectable";
import type { ResolveTheme } from "../../../../../theme/files/renderer/resolve-theme.injectable";
import type { UserPreferencesState } from "../../../../../user-preferences/common/state.injectable";

interface Dependencies {
  state: UserPreferencesState;
  findTheme: FindTheme;
  resolveTheme: ResolveTheme;
}

const variants = [
  { type: "dark", name: "Dark", preference: "accentColorDark" },
  { type: "light", name: "Light", preference: "accentColorLight" },
] as const satisfies readonly {
  type: LensThemeType;
  name: string;
  preference: keyof UserPreferencesState;
}[];

const NonInjectedAccentColor = observer(({ state, findTheme, resolveTheme }: Dependencies) => {
  const theme = findTheme(state.theme);

  return (
    <section id="accent-color">
      <SubTitle title="Accent color" />
      <div className="flex flex-col gap-3">
        {variants.map(({ type, name, preference }) => {
          // Nothing stored stands for the accent of the theme itself, in this variant.
          const chosen = state[preference] || undefined;
          const themeAccent = resolveTheme(theme, type).colors.primary;
          const isCustom = chosen !== undefined && !accentColorOptions.some((option) => option.value === chosen);

          return (
            <div key={type} className="flex items-center gap-4">
              <span className="w-10">{name}</span>
              <ColorSwatchGroup label={`Accent color of the ${type} theme`}>
                <ColorSwatch
                  tooltip={`The accent of the ${theme.spec.displayName} theme`}
                  aria-label={`Theme: the accent of the ${theme.spec.displayName} theme`}
                  selected={chosen === undefined}
                  style={{ background: themeAccent, color: getTextColorOnAccent(themeAccent) }}
                  onClick={() => (state[preference] = undefined)}
                  data-testid={`accent-color-${type}-theme`}
                >
                  Theme
                </ColorSwatch>
                {accentColorOptions.map((option) => (
                  <ColorSwatch
                    key={option.value}
                    color={option.value}
                    tooltip={option.label}
                    aria-label={option.label}
                    selected={chosen === option.value}
                    onClick={() => (state[preference] = option.value)}
                    data-testid={`accent-color-${type}-${option.label.toLowerCase()}`}
                  />
                ))}
                <CustomColorSwatch
                  value={isCustom ? chosen : undefined}
                  initialColor={chosen ?? themeAccent}
                  onChange={(color) => (state[preference] = color)}
                  data-testid={`accent-color-${type}-custom`}
                />
              </ColorSwatchGroup>
            </div>
          );
        })}
      </div>
    </section>
  );
});

export const AccentColor = withInjectables<Dependencies>(NonInjectedAccentColor, {
  getProps: (di) => ({
    state: di.inject(userPreferencesStateInjectable),
    findTheme: di.inject(findThemeInjectable),
    resolveTheme: di.inject(resolveThemeInjectable),
  }),
});
