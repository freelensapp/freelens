/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import builtInThemeSource from "./freelens.theme.yaml?raw";
import { parseThemeFile } from "./parse";

import type { ThemeFile } from "./schema";

export const builtInThemeName = "freelens";

/**
 * The text of the built-in theme file, bundled with the application.
 */
export { builtInThemeSource };

const parseBuiltInTheme = (): ThemeFile => {
  const result = parseThemeFile(builtInThemeSource);

  if (!result.isValid) {
    throw new Error(`The built-in theme is invalid: ${result.error}`);
  }

  return result.theme;
};

/**
 * The built-in theme, which defines every token. Every other theme takes the tokens it leaves out
 * from it.
 */
export const builtInTheme: ThemeFile = parseBuiltInTheme();
