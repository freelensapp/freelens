/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { defaultTheme } from "../common/builtin-theme";
import availableThemesInjectable from "./available-themes.injectable";

import type { ThemeFile } from "../common/schema";

export type FindTheme = (name: string) => ThemeFile;

/**
 * The theme of a name, or the default theme when there is none, such as a theme whose file was
 * removed. Reactive when called in a derivation.
 */
const findThemeInjectable = getInjectable({
  id: "find-theme",
  instantiate: (di): FindTheme => {
    const availableThemes = di.inject(availableThemesInjectable);

    return (name) => availableThemes.get().find(({ theme }) => theme.metadata.name === name)?.theme ?? defaultTheme;
  },
});

export default findThemeInjectable;
