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
import { lensThemeDeclarationInjectionToken } from "../../../../../../renderer/themes/declaration";
import defaultLensThemeInjectable from "../../../../../../renderer/themes/default-theme.injectable";
import userPreferencesStateInjectable from "../../../../../user-preferences/common/state.injectable";
import styles from "./theme.module.scss";

import type { LensTheme } from "../../../../../../renderer/themes/lens-theme";
import type { UserPreferencesState } from "../../../../../user-preferences/common/state.injectable";

interface Dependencies {
  state: UserPreferencesState;
  defaultTheme: LensTheme;
  themes: LensTheme[];
}

const DEFAULT_ACCENT_COLOR = "#00a7a0";

// =============================================================================
// Accent color guidelines
// =============================================================================
// When adding a NEW option to `accentColorOptions`, make sure the candidate
// color does NOT match (or sit too close to) any of the theme's semantic /
// status colors below. Reusing or approximating these values would cause the
// accent to visually collide with status indicators (success, warning, error,
// badges, etc.) and confuse users.
//
// Reserved semantic colors (do NOT use as accent options):
//
//   Status / signal colors
//     colorSuccess              #43a047  (dark)   #206923  (light)
//     colorOk                   #4caf50  (dark)   #399c3d  (light)
//     colorError                #ce3933
//     colorSoftError            #e85555
//     colorWarning              #ff9800
//     buttonAccentBackground    #e85555
//
//   Decorative / palette colors with semantic meaning in the UI
//     golden                    #ffc63d
//     badgeBackgroundColor      #ffba44
//     helmIncubatorRepo         #ff7043
//     magenta                   #c93dce  (dark)   #c100cd  (light)
//
// Forbidden hue ranges as a quick visual reference:
//   - Reds       (0°–10°)    -> error / soft-error / button-accent
//   - Oranges    (15°–30°)   -> warning / helm incubator
//   - Yellows    (40°–55°)   -> golden / badge
//   - Greens     (90°–140°)  -> success / ok
//
// Safe hue zone for accents (cool half of the color wheel):
//   cyan -> sky -> blue -> indigo -> violet -> purple -> pink
//
// Rule of thumb: pick saturated tones that read clearly against both the dark
// theme backgrounds (mainBackground #1e2124, layoutBackground #2e3136,
// sidebarBackground #36393e) and the light theme backgrounds. Avoid shades
// within ~15° of any reserved hue and keep enough lightness/saturation
// distance from existing accent options so the swatches remain easy to tell
// apart in the picker.
// =============================================================================
const accentColorOptions = [
  { value: "#00a7a0", label: "Teal" },
  { value: "#00bcd4", label: "Cyan" },
  { value: "#29b6f6", label: "Sky" },
  { value: "#2196f3", label: "Blue" },
  { value: "#5c6bc0", label: "Indigo" },
  { value: "#7c4dff", label: "Violet" },
  { value: "#9c27b0", label: "Purple" },
  { value: "#b39ddb", label: "Lavender" },
  { value: "#e91e63", label: "Pink" },
  { value: "#f06292", label: "Rose" },
];

const ColorSwatch = ({ color }: { color: string }) => (
  <div className={styles.colorSwatch} style={{ backgroundColor: color }} />
);

const ColorOption = ({ option }: { option: { value: string; label: string } }) => (
  <div className={styles.colorOption}>
    <ColorSwatch color={option.value} />
    <span>{option.label}</span>
  </div>
);

const NonInjectedTheme = observer(({ state, themes, defaultTheme }: Dependencies) => {
  const themeOptions = [
    {
      value: "system", // TODO: replace with a sentinel value that isn't string (and serialize it differently)
      label: "Sync with computer",
    },
    ...themes.map((theme) => ({
      value: theme.name,
      label: theme.name,
    })),
  ];

  const currentColor = state.customAccentColor || DEFAULT_ACCENT_COLOR;

  return (
    <section id="appearance">
      <SubTitle title="Theme" />
      <div className={styles.selectRow}>
        <Select
          className={styles.themeSelect}
          id="theme-input"
          options={themeOptions}
          value={state.colorTheme}
          onChange={(value) => (state.colorTheme = value?.value ?? defaultTheme.name)}
          themeName="lens"
        />

        <Select
          className={styles.accentSelect}
          id="accent-color-select"
          options={accentColorOptions}
          value={currentColor}
          onChange={(value) => (state.customAccentColor = value?.value)}
          formatOptionLabel={(option) => <ColorOption option={option} />}
          themeName="lens"
        />
      </div>

      <div className={styles.colorPreview}>
        {currentColor !== DEFAULT_ACCENT_COLOR && (
          <button
            onClick={() => (state.customAccentColor = undefined)}
            className={styles.resetButton}
            title="Reset to default color"
          >
            Reset to Default
          </button>
        )}
      </div>
    </section>
  );
});

export const Theme = withInjectables<Dependencies>(NonInjectedTheme, {
  getProps: (di) => ({
    state: di.inject(userPreferencesStateInjectable),
    defaultTheme: di.inject(defaultLensThemeInjectable),
    themes: di.injectMany(lensThemeDeclarationInjectionToken),
  }),
});
