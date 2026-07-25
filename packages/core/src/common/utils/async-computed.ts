/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// `asyncComputed` and `IAsyncComputed` used to be provided by
// `@ogre-tools/injectable-react`, but they were dropped in the 23.x line. This
// is a faithful, dependency-free port of that implementation (built on mobx
// only) so the existing call sites keep the exact same semantics.

import { noop } from "es-toolkit";
import { action, computed, createAtom, observable, runInAction, untracked } from "mobx";

import type { IComputedValue } from "mobx";

export interface IAsyncComputed<T> {
  value: IComputedValue<T>;
  pending: IComputedValue<boolean>;
  invalidate: () => void;
}

interface AsyncComputedParams<T> {
  getValueFromObservedPromise: () => Promise<T>;
  valueWhenPending?: T;
  betweenUpdates?: "show-pending-value" | "show-latest-value";
}

const neutralizeObsoletePromise = Symbol.for("neutralize-obsolete-promise");

export function asyncComputed<T>({
  getValueFromObservedPromise,
  valueWhenPending,
  betweenUpdates = "show-pending-value",
}: AsyncComputedParams<T>): IAsyncComputed<T> {
  const invalidateAtom = createAtom("invalidate");
  const pendingBox = observable.box(false);
  let neutralizePreviousPromise: () => void = noop;

  const syncValueBox = observable.box(valueWhenPending, {
    name: "sync-value-box-for-async-computed",
    deep: false,
  });

  const computedPromise = computed(
    () => {
      if (untracked(() => pendingBox.get()) === true) {
        neutralizePreviousPromise();
      }

      invalidateAtom.reportObserved();

      runInAction(() => {
        pendingBox.set(true);

        if (betweenUpdates === "show-pending-value") {
          syncValueBox.set(valueWhenPending);
        }
      });

      return Promise.race([
        getValueFromObservedPromise(),
        new Promise<typeof neutralizeObsoletePromise>((resolve) => {
          neutralizePreviousPromise = () => resolve(neutralizeObsoletePromise);
        }),
      ]);
    },
    { name: "computed-promise-for-async-computed" },
  );

  const computedPromiseResult = computed(
    () => {
      computedPromise.get().then(
        action((value) => {
          if (value !== neutralizeObsoletePromise) {
            pendingBox.set(false);
            syncValueBox.set(value as T);
          }
        }),
      );

      return syncValueBox.get();
    },
    { name: "computed-promise-result-for-async-computed", keepAlive: true },
  );

  return {
    value: computedPromiseResult as IComputedValue<T>,

    invalidate: () => {
      runInAction(() => {
        invalidateAtom.reportChanged();
        pendingBox.set(true);

        if (betweenUpdates === "show-pending-value") {
          syncValueBox.set(valueWhenPending);
        }
      });
    },

    pending: computed(() => {
      computedPromiseResult.get();

      return pendingBox.get();
    }),
  };
}
