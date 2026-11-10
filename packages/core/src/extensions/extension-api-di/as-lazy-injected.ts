/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getDiForExtensionApi } from "./extension-api-di";

import type { Inject } from "@ogre-tools/injectable";

// A class cannot be called without `new`, so binding it in a plain function
// would break `new api.objectConstructor(...)`, and it needs no `this` anyway.
const isClass = (value: Function) => /^class[\s{]/.test(Function.prototype.toString.call(value));

/**
 * Exposes an injectable to the extension API as a lazy singleton: the proxy
 * is created at module load time, but the instance is injected from the DI
 * container only when a property is first accessed, after the container of
 * the process has been registered with `setDiForExtensionApi`.
 */
export const asLazyInjectedForExtensionApi = ((injectable: any, instantiationParameter: any) =>
  new Proxy(
    {},

    {
      apply(target: unknown, thisArg, argArray: unknown[]) {
        const fn = getDiForExtensionApi().inject(injectable, instantiationParameter) as unknown as (
          ...args: unknown[]
        ) => unknown;

        return fn(...argArray);
      },

      get(target: Record<string | symbol, unknown>, propertyName) {
        if (propertyName === "$$typeof") {
          return undefined;
        }

        const instance = getDiForExtensionApi().inject(injectable, instantiationParameter) as Record<
          string | symbol,
          unknown
        >;

        const propertyValue = instance[propertyName] ?? target[propertyName];

        if (typeof propertyValue === "function" && !isClass(propertyValue)) {
          return function (...args: unknown[]) {
            return propertyValue.apply(instance, args) as unknown;
          };
        }

        return propertyValue;
      },
    },
  )) as Inject;
