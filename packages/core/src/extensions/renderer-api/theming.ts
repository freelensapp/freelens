/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { asLegacyGlobalForExtensionApi } from "@freelensapp/legacy-global-di";
import activeThemeInjectable from "../../renderer/themes/active.injectable";
import type { LensTheme } from "../../renderer/themes/lens-theme";

export const activeTheme = asLegacyGlobalForExtensionApi(activeThemeInjectable);

/**
 * @deprecated This hides the reactivity of active theme, use {@link activeTheme} instead
 */
export function getActiveTheme() {
  return activeTheme.get();
}

export type { LensTheme };
