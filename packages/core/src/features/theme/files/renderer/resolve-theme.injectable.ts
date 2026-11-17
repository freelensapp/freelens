/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { defaultTheme } from "../common/builtin-theme";
import { resolveThemeVariant } from "../common/resolve";

import type { LensTheme } from "../../../../renderer/themes/lens-theme";
import type { ThemeFile, ThemeVariantName } from "../common/schema";

export type ResolveTheme = (theme: ThemeFile, variant: ThemeVariantName) => LensTheme;

/**
 * {@link resolveThemeVariant} against the default theme, remembered per theme file, so that the
 * same variant of the same file is the same object every time.
 */
const resolveThemeInjectable = getInjectable({
  id: "resolve-theme",
  instantiate: (): ResolveTheme => {
    const cache = new WeakMap<ThemeFile, Partial<Record<ThemeVariantName, LensTheme>>>();

    return (theme, variant) => {
      let variants = cache.get(theme);

      if (!variants) {
        variants = {};
        cache.set(theme, variants);
      }

      return (variants[variant] ??= resolveThemeVariant(theme, variant, defaultTheme));
    };
  },
});

export default resolveThemeInjectable;
