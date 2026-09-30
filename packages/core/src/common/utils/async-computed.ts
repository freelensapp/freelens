/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// `asyncComputed` and `IAsyncComputed` used to be provided by
// `@ogre-tools/injectable-react`, but they were dropped in the 23.x line. This
// is a faithful, dependency-free port of that implementation (built on mobx
// only) so the existing call sites keep the exact same semantics.

import { noop } from "es-toolkit";
import { action, computed, createAtom, observable, reaction, runInAction, untracked } from "mobx";

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

  // Resolve promises into syncValueBox via a reaction rather than inside a
  // keepAlive computed.  The previous implementation attached `.then()` inside
  // a `computed({ keepAlive: true })` that also read `syncValueBox`.  When the
  // `.then()` handler set `syncValueBox`, it invalidated the same computed,
  // which re-attached `.then()` to the (already-resolved) cached promise,
  // scheduling another microtask, creating a tight feedback loop that pegged
  // the renderer at 100 % CPU.
  //
  // A `reaction` breaks the cycle: it watches `computedPromise` for new
  // promises and attaches `.then()`, but the handler's write to `syncValueBox`
  // does not re-trigger the reaction (reactions only re-trigger when the *data
  // function* returns a new value, i.e. a new promise).
  reaction(
    () => computedPromise.get(),
    (promise) => {
      promise.then(
        action((value) => {
          if (value !== neutralizeObsoletePromise) {
            pendingBox.set(false);
            syncValueBox.set(value as T);
          }
        }),
      );
    },
    { fireImmediately: true },
  );

  const computedValue = computed(() => syncValueBox.get(), {
    name: "computed-value-for-async-computed",
  });

  return {
    value: computedValue as IComputedValue<T>,

    invalidate: () => {
      runInAction(() => {
        invalidateAtom.reportChanged();
        pendingBox.set(true);

        if (betweenUpdates === "show-pending-value") {
          syncValueBox.set(valueWhenPending);
        }
      });
    },

    pending: computed(() => pendingBox.get()),
  };
}
