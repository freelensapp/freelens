/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { Inject } from "@ogre-tools/injectable";
import { getLegacyGlobalDiForExtensionApi } from "./global-di";

export const asLegacyGlobalFunctionForExtensionApi = ((injectableKey, instantiationParameter) =>
  (...args: unknown[]) => {
    const injected = getLegacyGlobalDiForExtensionApi().inject(injectableKey, instantiationParameter) as unknown as (
      ...args: unknown[]
    ) => unknown;

    return injected(...args);
  }) as Inject;
