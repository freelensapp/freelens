/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectionToken } from "@ogre-tools/injectable";

import type { InjectionToken } from "@ogre-tools/injectable";
import type { ReadonlyDeep } from "type-fest";

import type { LensTheme } from "./lens-theme";

// The explicit annotation keeps `ReadonlyDeep` unexpanded in declaration emit
// (the extension-api d.ts build); without it the emitter reaches for
// type-fest internals it cannot reference (TS2742).
export const lensThemeDeclarationInjectionToken: InjectionToken<ReadonlyDeep<LensTheme>, void> = getInjectionToken<
  ReadonlyDeep<LensTheme>
>({
  id: "lens-theme-declaration",
});
