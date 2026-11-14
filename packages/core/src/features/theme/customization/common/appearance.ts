/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import z from "zod";

export type UiDensity = "comfortable" | "compact";

/**
 * Appearance adjustments layered over whichever theme is active.
 */
export interface AppearancePreferences {
  /** A `#rrggbb` colour that replaces the theme's accent, or undefined to keep the theme's own. */
  accentColor?: string;
  density: UiDensity;
  /** Base UI font size in pixels. */
  fontSize: number;
}

export const minUiFontSize = 11;
export const maxUiFontSize = 18;

export const defaultAppearancePreferences: AppearancePreferences = {
  accentColor: undefined,
  density: "comfortable",
  fontSize: 13,
};

const hexColorPattern = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

export const isHexColor = (value: unknown): value is string => typeof value === "string" && hexColorPattern.test(value);

export const clampUiFontSize = (value: unknown) => {
  const size =
    typeof value === "number" && Number.isFinite(value) ? Math.round(value) : defaultAppearancePreferences.fontSize;

  return Math.min(maxUiFontSize, Math.max(minUiFontSize, size));
};

export const normalizeAppearancePreferences = (
  value: Partial<AppearancePreferences> | undefined,
): AppearancePreferences => ({
  accentColor: isHexColor(value?.accentColor) ? value.accentColor : undefined,
  density: value?.density === "compact" ? "compact" : "comfortable",
  fontSize: clampUiFontSize(value?.fontSize ?? defaultAppearancePreferences.fontSize),
});

/**
 * A user theme as it is stored in the preferences and in exported `.json`
 * files. It either extends a built-in theme (`extends`), overriding some of
 * its tokens, or lists every token itself.
 */
export interface CustomThemeDefinition {
  name: string;
  type: "dark" | "light";
  description?: string;
  author?: string;
  /** Name of the theme this one starts from. Defaults to the ProLens theme of the same `type`. */
  extends?: string;
  colors?: Record<string, string>;
  terminalColors?: Record<string, string>;
}

const colorValue = z.string().trim().min(1).max(64);

export const customThemeDefinitionSchema = z.object({
  name: z.string().trim().min(1).max(64),
  type: z.enum(["dark", "light"]),
  description: z.string().max(256).optional(),
  author: z.string().max(128).optional(),
  extends: z.string().max(64).optional(),
  colors: z.record(z.string(), colorValue).optional(),
  terminalColors: z.record(z.string(), colorValue).optional(),
});

export type ParseCustomThemeResult =
  | { callWasSuccessful: true; response: CustomThemeDefinition }
  | { callWasSuccessful: false; error: string };

/**
 * Parses the text of an imported theme file. Unknown top-level fields are
 * dropped; token names are checked against the known ones by the renderer.
 */
export const parseCustomThemeDefinition = (text: string): ParseCustomThemeResult => {
  let raw: unknown;

  try {
    raw = JSON.parse(text);
  } catch (error) {
    return { callWasSuccessful: false, error: `The file is not valid JSON: ${(error as Error).message}` };
  }

  const result = customThemeDefinitionSchema.safeParse(raw);

  if (!result.success) {
    const issue = result.error.issues[0];
    const path = issue?.path.join(".") || "theme";

    return { callWasSuccessful: false, error: `Invalid theme (${path}): ${issue?.message ?? "unknown error"}` };
  }

  return { callWasSuccessful: true, response: result.data };
};

/**
 * Keeps only the stored themes that still validate, and the first of any
 * that share a name.
 */
export const normalizeCustomThemes = (value: unknown): CustomThemeDefinition[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const themes: CustomThemeDefinition[] = [];

  for (const entry of value) {
    const result = customThemeDefinitionSchema.safeParse(entry);

    if (result.success && !seen.has(result.data.name)) {
      seen.add(result.data.name);
      themes.push(result.data);
    }
  }

  return themes;
};
