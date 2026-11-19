/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { lensColorNames, terminalColorNames } from "./token-descriptions";

import type { LensColorName, LensTheme, TerminalColorName } from "../../../../renderer/themes/lens-theme";
import type { ThemeEditorSpec, ThemeEditorTokens, ThemeFile, ThemeVariantName } from "./schema";

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

export interface ResolvedEditorTheme {
  base: NonNullable<ThemeEditorSpec["base"]>;
  inherit: boolean;
  colors: Record<string, string>;
  tokens: ThemeEditorTokens;
}

/**
 * The editor theme of a variant: every field, editor color and token the variant leaves out comes
 * from the default theme in the same variant, so that a theme can change a single token. A token
 * the variant sets replaces the one of the default theme as a whole.
 */
export const resolveEditorTheme = (
  theme: ThemeFile,
  variant: ThemeVariantName,
  defaultTheme: ThemeFile,
): ResolvedEditorTheme => {
  const builtInEditor = defaultTheme.spec[variant]?.editor;
  const editor = theme.spec[variant]?.editor;
  const base = editor?.base ?? builtInEditor?.base;

  if (!base) {
    throw new Error(`The default theme has no editor base for the ${variant} variant`);
  }

  return {
    base,
    inherit: editor?.inherit ?? builtInEditor?.inherit ?? true,
    colors: { ...builtInEditor?.colors, ...editor?.colors },
    tokens: { ...builtInEditor?.tokens, ...editor?.tokens },
  };
};

export interface MonacoTokenRule {
  token: string;
  foreground?: string;
  background?: string;
  fontStyle?: string;
}

const toMonacoColor = (color: string) => color.replace(/^#/, "");

/**
 * The token styles of an editor theme as the list of rules Monaco takes, its colors without `#`.
 */
export const getMonacoTokenRules = (tokens: ThemeEditorTokens): MonacoTokenRule[] =>
  Object.entries(tokens).map(([token, value]) => {
    const { foreground, background, fontStyle } = typeof value === "string" ? { foreground: value } : value;

    return {
      token,
      ...(foreground === undefined ? {} : { foreground: toMonacoColor(foreground) }),
      ...(background === undefined ? {} : { background: toMonacoColor(background) }),
      ...(fontStyle === undefined ? {} : { fontStyle }),
    };
  });

/**
 * A variant of a theme as the application applies it: every token, the missing ones taken from
 * the default theme in the same variant, and the unknown ones left out. A theme without the
 * variant gets its only one.
 */
export const resolveThemeVariant = (
  theme: ThemeFile,
  requestedVariant: ThemeVariantName,
  defaultTheme: ThemeFile,
): LensTheme => {
  const variant = getEffectiveVariant(theme, requestedVariant);
  const spec = theme.spec[variant];
  const builtInSpec = defaultTheme.spec[variant];

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
    ...(theme.metadata.name === defaultTheme.metadata.name ? { isDefault: true } : {}),
  };
};
