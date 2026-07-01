/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { defaultAccentColor } from "../../common/vars";

import type { ReadonlyDeep } from "type-fest";
import type { LensColorName, LensTheme } from "./lens-theme";

export interface AccentColor {
  name: string;
  value: string;
}

export { defaultAccentColor };

export const accentColorPresets: AccentColor[] = [
  { name: "Teal", value: defaultAccentColor },
  { name: "Blue", value: "#2563eb" },
  { name: "Indigo", value: "#6366f1" },
  { name: "Purple", value: "#9333ea" },
  { name: "Pink", value: "#ec4899" },
  { name: "Red", value: "#dc2626" },
  { name: "Orange", value: "#ea580c" },
  { name: "Green", value: "#16a34a" },
];

/**
 * Theme color keys that may be overridden by the accent color.
 * The override only replaces values that match the default teal on a given
 * theme, so per-theme intentional differences are preserved.
 */
export const accentOverrideKeys: LensColorName[] = [
  "primary",
  "blue",
  "buttonPrimaryBackground",
  "menuActiveBackground",
  "sidebarSubmenuActiveColor",
  "helmStableRepo",
  "colorInfo",
];

/**
 * Replace the default teal with the chosen accent color, but only on keys
 * in `accentOverrideKeys` whose value currently equals the default teal.
 * This preserves intentional per-theme differences (for example the dark
 * theme keeps its white `sidebarSubmenuActiveColor`). Returns the original
 * theme unchanged when the accent is the default or nothing matches.
 */
export function applyAccentColorOverride(
  theme: ReadonlyDeep<LensTheme>,
  accent: string,
): ReadonlyDeep<LensTheme> {
  if (accent === defaultAccentColor) {
    return theme;
  }

  const overriddenColors = { ...theme.colors };
  let changed = false;

  for (const key of accentOverrideKeys) {
    if (overriddenColors[key] === defaultAccentColor) {
      overriddenColors[key] = accent;
      changed = true;
    }
  }

  if (!changed) {
    return theme;
  }

  return {
    ...theme,
    colors: overriddenColors,
  } as ReadonlyDeep<LensTheme>;
}
