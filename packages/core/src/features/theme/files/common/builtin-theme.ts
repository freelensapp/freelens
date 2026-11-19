/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import ayuSource from "./ayu.theme.yaml?raw";
import ayuMirageSource from "./ayu-mirage.theme.yaml?raw";
import catppuccinSource from "./catppuccin.theme.yaml?raw";
import draculaSource from "./dracula.theme.yaml?raw";
import freelensSource from "./freelens.theme.yaml?raw";
import graphiteSource from "./graphite.theme.yaml?raw";
import highContrastSource from "./high-contrast.theme.yaml?raw";
import { parseThemeFile } from "./parse";
import solarizedSource from "./solarized.theme.yaml?raw";

import type { ThemeFile } from "./schema";

export interface BuiltInTheme {
  theme: ThemeFile;
  /**
   * The text of the theme file, bundled with the application.
   */
  source: string;
}

const parseBuiltInTheme = (source: string): BuiltInTheme => {
  const result = parseThemeFile(source);

  if (!result.isValid) {
    throw new Error(`A built-in theme is invalid: ${result.error}`);
  }

  return { theme: result.theme, source };
};

/**
 * The themes bundled with the application, in the order the preferences list them: the default
 * theme first.
 */
export const builtInThemes: readonly BuiltInTheme[] = [
  freelensSource,
  ayuSource,
  ayuMirageSource,
  draculaSource,
  graphiteSource,
  catppuccinSource,
  solarizedSource,
  highContrastSource,
].map(parseBuiltInTheme);

export const defaultThemeName = "freelens";

/**
 * The built-in theme of a name, if there is one.
 */
export const findBuiltInTheme = (name: string): ThemeFile | undefined =>
  builtInThemes.find(({ theme }) => theme.metadata.name === name)?.theme;

/**
 * Whether a name is taken by a built-in theme, so that neither an import nor a file of the themes
 * directory can take it.
 */
export const isBuiltInThemeName = (name: string) => findBuiltInTheme(name) !== undefined;

const getDefaultTheme = (): BuiltInTheme => {
  const builtIn = builtInThemes.find(({ theme }) => theme.metadata.name === defaultThemeName);

  if (!builtIn) {
    throw new Error(`There is no built-in theme named "${defaultThemeName}"`);
  }

  return builtIn;
};

/**
 * The default theme, which defines every token. Every other theme, built-in or imported, takes the
 * tokens it leaves out from it.
 */
export const { theme: defaultTheme, source: defaultThemeSource } = getDefaultTheme();
