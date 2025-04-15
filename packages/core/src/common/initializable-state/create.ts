/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import assert from "assert";
import type { Runnable } from "@freelensapp/run-many";
import type { DiContainerForInjection, Injectable, InjectionToken } from "@ogre-tools/injectable";
import { getInjectable, getInjectionToken } from "@ogre-tools/injectable";

export interface Initializable<T> {
  readonly rootId: string;
  readonly stateToken: InjectionToken<T, void>;
}

export const getInitializable = <T>(rootId: string): Initializable<T> => ({
  rootId,
  stateToken: getInjectionToken<T>({
    id: `${rootId}-state-token`,
  }),
});

type InitState<T> = { set: true; value: T } | { set: false };

export type ImplInitializableInjectionTokensArgs<T> = {
  token: Initializable<T>;
  init: (di: DiContainerForInjection) => T | Promise<T>;
} & (
  | {
      phase: InjectionToken<Runnable<void>, void>;
      runAfter?: Injectable<Runnable<void>, Runnable<void>, void>[];
    }
  | {
      runAfter: Injectable<Runnable<void>, Runnable<void>, void>;
      phase?: undefined;
    }
);

export const getInjectablesForInitializable = <T>({
  init,
  token: { rootId, stateToken },
  ...rest
}: ImplInitializableInjectionTokensArgs<T>) => {
  let state: InitState<T> = { set: false };

  const stateInjectable = getInjectable({
    id: `${rootId}-state`,
    instantiate: () => {
      assert(state.set, `Tried to inject "${rootId}" before initialization was complete`);

      return state.value;
    },
    injectionToken: stateToken,
  });
  const initializationInjectable = getInjectable({
    id: `${rootId}-initialization`,
    instantiate: (di) => ({
      run: async () => {
        state = {
          set: true,
          value: await init(di),
        };
      },
      runAfter: rest.runAfter,
    }),
    injectionToken: (() => {
      if (rest.runAfter && !Array.isArray(rest.runAfter)) {
        return rest.runAfter.injectionToken;
      }

      return rest.phase;
    })(),
  });

  return {
    stateInjectable,
    initializationInjectable,
  };
};
