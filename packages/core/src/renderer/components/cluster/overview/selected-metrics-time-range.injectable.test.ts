/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { action, observable } from "mobx";
import metricsTimeRangeStorageInjectable from "./metrics-time-range-storage.injectable";
import selectedMetricsTimeRangeInjectable from "./selected-metrics-time-range.injectable";

type RawMetricsTimeRange = {
  duration: number | null;
  customStart?: number;
  customEnd?: number;
};

describe("selectedMetricsTimeRangeInjectable", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2024-01-01T00:00:00Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("advances duration timestamps when time moves forward", () => {
    const { selectedMetricsTimeRange } = instantiateWithStorage({ duration: 3600 });
    const initial = selectedMetricsTimeRange.timestamps.get();

    jest.advanceTimersByTime(60 * 1000);

    const updated = selectedMetricsTimeRange.timestamps.get();

    expect(updated.start).toBe(initial.start + 60);
    expect(updated.end).toBe(initial.end + 60);
  });

  it("keeps custom timestamps fixed when time moves forward", () => {
    const { selectedMetricsTimeRange } = instantiateWithStorage({ duration: null, customStart: 100, customEnd: 200 });
    const initial = selectedMetricsTimeRange.timestamps.get();

    jest.advanceTimersByTime(60 * 1000);

    expect(selectedMetricsTimeRange.timestamps.get()).toEqual(initial);
  });

  it.each([
    { duration: null, customStart: 100 },
    { duration: null, customEnd: 200 },
  ] as const)("silently resets incomplete persisted custom ranges to the default duration", (initialValue) => {
    const { selectedMetricsTimeRange, state } = instantiateWithStorage(initialValue);

    expect(selectedMetricsTimeRange.value.get()).toEqual({
      duration: 3600,
      customStart: undefined,
      customEnd: undefined,
    });
    expect(selectedMetricsTimeRange.label.get()).toBe("1 hour");
    expect(state.get()).toEqual({
      duration: 3600,
      customStart: undefined,
      customEnd: undefined,
    });
  });

  it("removes stray custom boundaries from persisted duration ranges", () => {
    const { selectedMetricsTimeRange, state } = instantiateWithStorage({
      duration: 3600,
      customStart: 100,
      customEnd: 200,
    });

    expect(selectedMetricsTimeRange.value.get()).toEqual({
      duration: 3600,
      customStart: undefined,
      customEnd: undefined,
    });
    expect(state.get()).toEqual({
      duration: 3600,
      customStart: undefined,
      customEnd: undefined,
    });
  });
});

function instantiateWithStorage(initialValue: RawMetricsTimeRange) {
  const state = observable.box<RawMetricsTimeRange>(initialValue, { deep: false });
  const storage = {
    get: () => state.get(),
    merge: action((update: Partial<RawMetricsTimeRange>) => {
      state.set({
        ...state.get(),
        ...update,
      });
    }),
    set: action((value: RawMetricsTimeRange) => {
      state.set(value);
    }),
  };

  const selectedMetricsTimeRange = selectedMetricsTimeRangeInjectable.instantiate({
    inject: (injectable: unknown) => {
      if (injectable === metricsTimeRangeStorageInjectable) {
        return storage;
      }

      throw new Error(`Unexpected injectable: ${String(injectable)}`);
    },
  } as never);

  return {
    selectedMetricsTimeRange,
    state,
  };
}
