/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { systemThemeNames } from "./palettes";

import type { ReadonlyDeep } from "type-fest";

import type { CustomThemeDefinition } from "../../../features/theme/customization/common/appearance";
import type { LensColorName, LensTheme, TerminalColorName } from "../lens-theme";

type Theme = ReadonlyDeep<LensTheme>;

const pickKnown = <K extends string>(
  known: Readonly<Record<K, unknown>>,
  overrides: Record<string, string> | undefined,
) => Object.fromEntries(Object.entries(overrides ?? {}).filter(([key]) => key in known)) as Partial<Record<K, string>>;

/**
 * Names of the tokens of `definition` that no theme knows. Shown on import so
 * a typo does not pass silently.
 */
export const unknownTokensOf = (definition: CustomThemeDefinition, reference: Theme) => [
  ...Object.keys(definition.colors ?? {}).filter((key) => !(key in reference.colors)),
  ...Object.keys(definition.terminalColors ?? {})
    .filter((key) => !(key in reference.terminalColors) && !terminalColorNames.has(key as TerminalColorName))
    .map((key) => `terminalColors.${key}`),
];

const terminalColorNames = new Set<TerminalColorName>([
  "foreground",
  "background",
  "cursor",
  "cursorAccent",
  "selectionBackground",
  "selectionForeground",
  "selectionInactiveBackground",
  "scrollbarSliderBackground",
  "scrollbarSliderHoverBackground",
  "scrollbarSliderActiveBackground",
  "overviewRulerBorder",
  "black",
  "red",
  "green",
  "yellow",
  "blue",
  "magenta",
  "cyan",
  "white",
  "brightBlack",
  "brightRed",
  "brightGreen",
  "brightYellow",
  "brightBlue",
  "brightMagenta",
  "brightCyan",
  "brightWhite",
]);

/**
 * A full theme from a user definition: the tokens of the theme it extends,
 * overridden by its own. Undefined when its name belongs to a built-in theme,
 * which always wins.
 */
export const resolveCustomTheme = (
  definition: CustomThemeDefinition,
  builtIns: ReadonlyMap<string, Theme>,
): LensTheme | undefined => {
  if (builtIns.has(definition.name)) {
    return undefined;
  }

  const base =
    (definition.extends ? builtIns.get(definition.extends) : undefined) ??
    builtIns.get(systemThemeNames[definition.type]) ??
    [...builtIns.values()].find((theme) => theme.type === definition.type);

  if (!base) {
    return undefined;
  }

  return {
    name: definition.name,
    type: definition.type,
    description: definition.description ?? `Custom theme based on ${base.name}`,
    author: definition.author ?? "You",
    monacoTheme: base.type === definition.type ? base.monacoTheme : definition.type === "light" ? "vs" : "vs-dark",
    colors: { ...(base.colors as Record<LensColorName, string>), ...pickKnown(base.colors, definition.colors) },
    terminalColors: {
      ...(base.terminalColors as Partial<Record<TerminalColorName, string>>),
      ...(Object.fromEntries(
        Object.entries(definition.terminalColors ?? {}).filter(([key]) =>
          terminalColorNames.has(key as TerminalColorName),
        ),
      ) as Partial<Record<TerminalColorName, string>>),
    },
  };
};

/**
 * The definition a theme exports to, listing every token so that the file is
 * a complete starting point for editing.
 */
export const toCustomThemeDefinition = (theme: Theme, name = theme.name): CustomThemeDefinition => ({
  name,
  type: theme.type,
  description: theme.description,
  author: theme.author,
  colors: { ...(theme.colors as Record<string, string>) },
  terminalColors: { ...(theme.terminalColors as Record<string, string>) },
});
