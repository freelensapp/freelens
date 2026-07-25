/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getDiForExtensionApi } from "./extension-api-di";

import type { Inject } from "@ogre-tools/injectable";

/**
 * Exposes a callable injectable to the extension API lazily: the wrapper is
 * created at module load time, but the function is injected from the DI
 * container only when called, after the container of the process has been
 * registered with `setDiForExtensionApi`.
 */
export const asLazyInjectedFunctionForExtensionApi = ((injectableKey: any, instantiationParameter: any) =>
  (...args: unknown[]) => {
    const injected = getDiForExtensionApi().inject(injectableKey, instantiationParameter) as unknown as (
      ...args: unknown[]
    ) => unknown;

    return injected(...args);
  }) as Inject;
