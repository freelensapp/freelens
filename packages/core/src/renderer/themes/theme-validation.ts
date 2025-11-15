/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import Color from "color";

import type { LensTheme, LensColorName, TerminalColorName } from "./lens-theme";

const requiredColorNames: LensColorName[] = [
  "blue",
  "magenta",
  "golden",
  "halfGray",
  "primary",
  "textColorPrimary",
  "textColorSecondary",
  "textColorTertiary",
  "textColorAccent",
  "textColorDimmed",
  "borderColor",
  "borderFaintColor",
  "mainBackground",
  "secondaryBackground",
  "contentColor",
  "layoutBackground",
  "layoutTabsBackground",
  "layoutTabsActiveColor",
  "layoutTabsLineColor",
  "sidebarLogoBackground",
  "sidebarActiveColor",
  "sidebarSubmenuActiveColor",
  "sidebarBackground",
  "sidebarItemHoverBackground",
  "badgeBackgroundColor",
  "buttonPrimaryBackground",
  "buttonDefaultBackground",
  "buttonLightBackground",
  "buttonAccentBackground",
  "buttonDisabledBackground",
  "tableBgcStripe",
  "tableBgcSelected",
  "tableHeaderBackground",
  "tableHeaderColor",
  "tableSelectedRowColor",
];

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function isValidColor(color: string): boolean {
  try {
    Color(color);
    return true;
  } catch {
    return false;
  }
}

export function validateTheme(theme: Partial<LensTheme>): ValidationResult {
  const errors: string[] = [];

  // Check required fields
  if (!theme.name || typeof theme.name !== "string" || theme.name.trim() === "") {
    errors.push("Theme name is required and must be a non-empty string");
  }

  if (!theme.type || (theme.type !== "dark" && theme.type !== "light")) {
    errors.push("Theme type must be either 'dark' or 'light'");
  }

  if (!theme.description || typeof theme.description !== "string") {
    errors.push("Theme description is required");
  }

  if (!theme.author || typeof theme.author !== "string") {
    errors.push("Theme author is required");
  }

  if (!theme.monacoTheme || typeof theme.monacoTheme !== "string") {
    errors.push("Monaco theme is required");
  }

  // Validate colors
  if (!theme.colors || typeof theme.colors !== "object") {
    errors.push("Colors object is required");
  } else {
    // Check for missing required colors
    for (const colorName of requiredColorNames) {
      if (!theme.colors[colorName]) {
        errors.push(`Missing required color: ${colorName}`);
      } else if (!isValidColor(theme.colors[colorName])) {
        errors.push(`Invalid color value for ${colorName}: ${theme.colors[colorName]}`);
      }
    }
  }

  // Validate terminal colors if present
  if (theme.terminalColors) {
    if (typeof theme.terminalColors !== "object") {
      errors.push("Terminal colors must be an object");
    } else {
      for (const [colorName, colorValue] of Object.entries(theme.terminalColors)) {
        if (colorValue && !isValidColor(colorValue)) {
          errors.push(`Invalid terminal color value for ${colorName}: ${colorValue}`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function sanitizeThemeName(name: string): string {
  return name.trim().replace(/[^a-zA-Z0-9-_ ]/g, "");
}
