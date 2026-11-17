/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import activeThemeInjectable from "../../renderer/themes/active.injectable";
import { asLazyInjectedForExtensionApi } from "../extension-api-di";

import type { ReadonlyDeep } from "@freelensapp/type-fest";

import type { IComputedValue } from "mobx";

import type { LensTheme } from "../../renderer/themes/lens-theme";

// The explicit annotation keeps `ReadonlyDeep` unexpanded in declaration emit (the extension-api
// d.ts build); without it the emitter reaches for the internal helpers of type-fest (TS2742).
/**
 * The active theme in the variant in use, a mobx computed: reading it inside a reaction tracks
 * every change of the theme, of its variant and of the accent color.
 *
 * - `name` is the `metadata.name` of the theme file, `freelens` for the built-in theme in both
 *   variants. Use `type` to tell dark from light.
 * - `colors` and `terminalColors` are complete: the tokens of the file, the missing ones from the
 *   built-in theme, and the accent color applied.
 * - `monacoTheme` is the name the editor theme of the variant is registered under in the shared
 *   Monaco instance. `"clouds-midnight"` stays registered as the dark editor theme of the built-in
 *   theme.
 */
export const activeTheme: IComputedValue<ReadonlyDeep<LensTheme>> =
  asLazyInjectedForExtensionApi(activeThemeInjectable);

export type { LensTheme };
