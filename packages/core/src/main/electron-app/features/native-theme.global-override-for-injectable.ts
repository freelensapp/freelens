/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getGlobalOverride } from "@freelensapp/test-utils";
import EventEmitter from "events";
import nativeThemeInjectable from "./native-theme.injectable";

export default getGlobalOverride(nativeThemeInjectable, () =>
  Object.assign(new EventEmitter(), {
    shouldUseDarkColors: true,
    inForcedColorsMode: true,
    shouldUseHighContrastColors: false,
    shouldUseInvertedColorScheme: false,
    shouldUseDarkColorsForSystemIntegratedUI: true,
    prefersReducedTransparency: false,
    themeSource: "dark" as const,
  }),
);
