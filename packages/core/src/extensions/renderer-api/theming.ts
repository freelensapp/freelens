/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { asLegacyGlobalForExtensionApi } from "@freelensapp/legacy-global-di";
import activeThemeInjectable from "../../renderer/themes/active.injectable";

import type { IComputedValue } from "mobx";
import type { ReadonlyDeep } from "type-fest";

import type { LensTheme } from "../../renderer/themes/lens-theme";

// Annotated for declaration emit; see ../../renderer/themes/declaration.ts.
export const activeTheme: IComputedValue<ReadonlyDeep<LensTheme>> =
  asLegacyGlobalForExtensionApi(activeThemeInjectable);

/**
 * @deprecated This hides the reactivity of active theme, use {@link activeTheme} instead
 */
export function getActiveTheme(): ReadonlyDeep<LensTheme> {
  return activeTheme.get();
}

export type { LensTheme };
