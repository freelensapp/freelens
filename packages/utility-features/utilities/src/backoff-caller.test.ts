/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { backoffCaller } from "./backoff-caller";

import type { Result } from "./result";

const success: Result<string, string> = { callWasSuccessful: true, response: "ok" };
const failure = (attempt: number): Result<string, string> => ({ callWasSuccessful: false, error: `error ${attempt}` });

const trackSettled = <T>(promise: Promise<T>) => {
  const state = { settled: false };

  void promise.then(() => {
    state.settled = true;
  });

  return state;
};

describe("backoffCaller", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the first success without any delay", async () => {
    const fn = vi.fn(async () => success);
    const onIntermediateError = vi.fn();

    const result = await backoffCaller(fn, { onIntermediateError });

    expect(result).toEqual(success);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(onIntermediateError).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("returns a later success after the delays of the failed attempts only", async () => {
    let attempt = 0;
    const fn = vi.fn(async () => {
      attempt += 1;

      return attempt < 3 ? failure(attempt) : success;
    });
    const onIntermediateError = vi.fn();

    const promise = backoffCaller(fn, { onIntermediateError });
    const state = trackSettled(promise);

    await vi.advanceTimersByTimeAsync(1000 + 2000 - 1);
    expect(state.settled).toBe(false);
    expect(fn).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(1);
    expect(state.settled).toBe(true);
    expect(fn).toHaveBeenCalledTimes(3);
    expect(vi.getTimerCount()).toBe(0);

    expect(await promise).toEqual(success);
    expect(onIntermediateError.mock.calls).toEqual([
      ["error 1", 1],
      ["error 2", 2],
    ]);
  });

  it("returns the last failure without waiting after the last attempt", async () => {
    let attempt = 0;
    const fn = vi.fn(async () => {
      attempt += 1;

      return failure(attempt);
    });
    const onIntermediateError = vi.fn();

    const promise = backoffCaller(fn, { onIntermediateError });
    const state = trackSettled(promise);

    await vi.advanceTimersByTimeAsync(1000 + 2000 + 4000 + 8000 - 1);
    expect(state.settled).toBe(false);
    expect(fn).toHaveBeenCalledTimes(4);

    await vi.advanceTimersByTimeAsync(1);
    expect(state.settled).toBe(true);
    expect(fn).toHaveBeenCalledTimes(5);
    expect(vi.getTimerCount()).toBe(0);

    expect(await promise).toEqual(failure(5));
    expect(onIntermediateError.mock.calls).toEqual([
      ["error 1", 1],
      ["error 2", 2],
      ["error 3", 3],
      ["error 4", 4],
      ["error 5", 5],
    ]);
  });
});
