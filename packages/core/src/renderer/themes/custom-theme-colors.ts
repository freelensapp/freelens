/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { LensColorName, LensTheme } from "./lens-theme";

export type CustomThemeColors = Partial<Record<LensColorName, string>>;

export const CUSTOMIZABLE_THEME_COLOR_NAMES = [
  "primary",
  "buttonPrimaryBackground",
  "menuActiveBackground",
  "sidebarSubmenuActiveColor",
  "sidebarActiveColor",
  "layoutTabsActiveColor",
  "textColorAccent",
  "colorInfo",
  "colorSuccess",
  "colorWarning",
  "colorError",
] as const satisfies readonly LensColorName[];

const themeColorPattern = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const colorInputPattern = /^#[0-9a-f]{6}$/i;

export const isValidThemeColorValue = (value: unknown): value is string =>
  typeof value === "string" && themeColorPattern.test(value);

export const toColorInputValue = (value: unknown): string => {
  if (!isValidThemeColorValue(value)) {
    return "#000000";
  }

  if (colorInputPattern.test(value)) {
    return value;
  }

  if (value.length === 4) {
    return `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`;
  }

  return value.slice(0, 7);
};

export const mergeCustomThemeColors = (
  theme: LensTheme,
  customThemeColors: Record<string, unknown> | undefined,
): LensTheme["colors"] => {
  const colors = { ...theme.colors };

  if (!customThemeColors) {
    return colors;
  }

  for (const [name, value] of Object.entries(customThemeColors)) {
    if (name in colors && isValidThemeColorValue(value)) {
      colors[name as LensColorName] = value;
    }
  }

  return colors;
};
