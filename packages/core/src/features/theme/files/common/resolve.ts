/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { lensColorNames, terminalColorNames } from "./token-descriptions";

import type { LensColorName, LensTheme, TerminalColorName } from "../../../../renderer/themes/lens-theme";
import type { ThemeEditorSpec, ThemeFile, ThemeVariantName } from "./schema";

/**
 * The variant of a theme that applies when `requested` is wanted: the requested one when the theme
 * has it, otherwise the only one it has.
 */
export const getEffectiveVariant = (theme: ThemeFile, requested: ThemeVariantName): ThemeVariantName => {
  if (theme.spec[requested]) {
    return requested;
  }

  return requested === "dark" ? "light" : "dark";
};

export const getAvailableVariants = (theme: ThemeFile): ThemeVariantName[] =>
  (["dark", "light"] as const).filter((variant) => theme.spec[variant] !== undefined);

/**
 * The name the editor theme of a variant is registered under in Monaco.
 */
export const getMonacoThemeName = (themeName: string, variant: ThemeVariantName) =>
  `freelens-theme-${themeName}-${variant}`;

const pickKnown = <Name extends string>(
  names: readonly Name[],
  values: Record<string, string | undefined> | undefined,
): Partial<Record<Name, string>> => {
  const result: Partial<Record<Name, string>> = {};

  for (const name of names) {
    const value = values?.[name];

    if (value !== undefined) {
      result[name] = value;
    }
  }

  return result;
};

/**
 * The editor theme of a variant, the built-in one when the theme has none.
 */
export const resolveEditorTheme = (
  theme: ThemeFile,
  variant: ThemeVariantName,
  builtInTheme: ThemeFile,
): ThemeEditorSpec => {
  const editor = theme.spec[variant]?.editor ?? builtInTheme.spec[variant]?.editor;

  if (!editor) {
    throw new Error(`The built-in theme has no editor theme for the ${variant} variant`);
  }

  return editor;
};

/**
 * A variant of a theme as the application applies it: every token, the missing ones taken from
 * the built-in theme in the same variant, and the unknown ones left out. A theme without the
 * variant gets its only one.
 */
export const resolveThemeVariant = (
  theme: ThemeFile,
  requestedVariant: ThemeVariantName,
  builtInTheme: ThemeFile,
): LensTheme => {
  const variant = getEffectiveVariant(theme, requestedVariant);
  const spec = theme.spec[variant];
  const builtInSpec = builtInTheme.spec[variant];

  return {
    name: theme.metadata.name,
    type: variant,
    description: theme.spec.description ?? "",
    author: theme.spec.author ?? "",
    monacoTheme: getMonacoThemeName(theme.metadata.name, variant),
    colors: {
      ...pickKnown<LensColorName>(lensColorNames, builtInSpec?.colors),
      ...pickKnown<LensColorName>(lensColorNames, spec?.colors),
    } as Record<LensColorName, string>,
    terminalColors: {
      ...pickKnown<TerminalColorName>(terminalColorNames, builtInSpec?.terminalColors),
      ...pickKnown<TerminalColorName>(terminalColorNames, spec?.terminalColors),
    },
    ...(theme.metadata.name === builtInTheme.metadata.name ? { isDefault: true } : {}),
  };
};
