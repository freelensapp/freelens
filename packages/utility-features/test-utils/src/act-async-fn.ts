/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import baseAsyncFn from "@async-fn/vitest";
import { act } from "@testing-library/react";

import type { AsyncFnMock } from "@async-fn/vitest";

export type { AsyncFnMock };

// ogre-tools 23 reimplemented async `withInjectables` (`getProps: async`) from
// a synchronous mobx `Observer` re-render to a plain React state update: the
// placeholder -> content swap is now a `setState` delivered in a promise
// microtask (`getProps(...).then(setState)`).
//
// The unit tests drive those views by settling `@async-fn/vitest` mocks
// (`await someMock.resolve(...)`) and then asserting synchronously
// (`getByTestId` / `queryByTestId`). The mock has no knowledge of React, so the
// resulting `.then(setState)` fires outside `act()` and is neither committed nor
// warning-free before the synchronous query runs.
//
// This wrapper settles each `resolve`/`resolveSpecific`/`reject` inside an
// async `act()`, so the `setState` scheduled by the mock's consumers is applied
// (and no "not wrapped in act(...)" warning is emitted) before control returns
// to the test. It deliberately does NOT add an extra promise/timer flush: doing
// so would let unrelated async work advance past the point the settling test
// asserts on (e.g. a follow-up reload the test expects to still be pending).
//
// React does not support overlapping `act()` calls. This helper is therefore
// wired only into the async dock/detail view tests, which settle their mocks
// sequentially (`await someMock.resolve(...)`). Tests that settle several mocks
// concurrently (`await Promise.all([a.resolve(), b.resolve()])`) keep the plain
// `@async-fn/vitest` import and are unaffected.
const settleInsideAct = <TArgs extends unknown[], TResult>(fn: (...args: TArgs) => Promise<TResult>) => {
  return async (...args: TArgs): Promise<TResult> => {
    let result!: TResult;

    await act(async () => {
      result = await fn(...args);
    });

    return result;
  };
};

export default function asyncFn<TToBeMocked extends (...args: any[]) => any>(): AsyncFnMock<TToBeMocked> {
  const mock = baseAsyncFn<TToBeMocked>();

  mock.resolve = settleInsideAct(mock.resolve.bind(mock)) as AsyncFnMock<TToBeMocked>["resolve"];
  mock.resolveSpecific = settleInsideAct(
    mock.resolveSpecific.bind(mock),
  ) as AsyncFnMock<TToBeMocked>["resolveSpecific"];
  mock.reject = settleInsideAct(mock.reject.bind(mock)) as AsyncFnMock<TToBeMocked>["reject"];

  return mock;
}
