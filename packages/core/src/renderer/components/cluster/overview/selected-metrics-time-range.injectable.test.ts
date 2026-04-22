/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { action, observable } from "mobx";
import metricsTimeRangeStorageInjectable, { type MetricsTimeRange } from "./metrics-time-range-storage.injectable";
import selectedMetricsTimeRangeInjectable from "./selected-metrics-time-range.injectable";

describe("selectedMetricsTimeRangeInjectable", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2024-01-01T00:00:00Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("advances duration timestamps when time moves forward", () => {
    const selectedMetricsTimeRange = instantiateWithStorage({ duration: 3600 });
    const initial = selectedMetricsTimeRange.timestamps.get();

    jest.advanceTimersByTime(60 * 1000);

    const updated = selectedMetricsTimeRange.timestamps.get();

    expect(updated.start).toBe(initial.start + 60);
    expect(updated.end).toBe(initial.end + 60);
  });

  it("keeps custom timestamps fixed when time moves forward", () => {
    const selectedMetricsTimeRange = instantiateWithStorage({ duration: null, customStart: 100, customEnd: 200 });
    const initial = selectedMetricsTimeRange.timestamps.get();

    jest.advanceTimersByTime(60 * 1000);

    expect(selectedMetricsTimeRange.timestamps.get()).toEqual(initial);
  });
});

function instantiateWithStorage(initialValue: MetricsTimeRange) {
  const state = observable.box<MetricsTimeRange>(initialValue, { deep: false });
  const storage = {
    get: () => state.get(),
    merge: action((update: Partial<MetricsTimeRange>) => {
      state.set({
        ...state.get(),
        ...update,
      });
    }),
  };

  return selectedMetricsTimeRangeInjectable.instantiate({
    inject: (injectable: unknown) => {
      if (injectable === metricsTimeRangeStorageInjectable) {
        return storage;
      }

      throw new Error(`Unexpected injectable: ${String(injectable)}`);
    },
  } as never);
}
