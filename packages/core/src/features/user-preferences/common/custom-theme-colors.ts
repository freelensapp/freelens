/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

export type CustomThemeColors = Record<string, string>;

export const customThemeColorPattern = /^#[0-9a-fA-F]{6}$/;

export const isCustomThemeColor = (value: unknown): value is string =>
  typeof value === "string" && customThemeColorPattern.test(value);

export const normalizeCustomThemeColors = (value: unknown): CustomThemeColors | undefined => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const normalizedColors: CustomThemeColors = {};

  for (const [name, color] of Object.entries(value)) {
    if (name && isCustomThemeColor(color)) {
      normalizedColors[name] = color.toLowerCase();
    }
  }

  return Object.keys(normalizedColors).length > 0 ? normalizedColors : undefined;
};
