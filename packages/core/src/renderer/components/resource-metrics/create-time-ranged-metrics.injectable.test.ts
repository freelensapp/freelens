/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

const asyncComputedMock = vi.fn((options: unknown) => options);
const nowMock = vi.fn();

vi.mock("@ogre-tools/injectable-react", async (importOriginal) => {
  const actual = await importOriginal<object>();

  return {
    ...actual,
    asyncComputed: (options: unknown) => asyncComputedMock(options),
  };
});

vi.mock("mobx-utils", async (importOriginal) => {
  const actual = await importOriginal<object>();

  return {
    ...actual,
    now: (interval: number) => nowMock(interval),
  };
});

import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import selectedMetricsTimeRangeInjectable from "../cluster/overview/selected-metrics-time-range.injectable";
import { createTimeRangedMetricsInjectable } from "./create-time-ranged-metrics";

interface TestObject {
  getId: () => string;
}

type IsAny<T> = 0 extends 1 & T ? true : false;
type AssertFalse<T extends false> = T;

describe("createTimeRangedMetricsInjectable", () => {
  beforeEach(() => {
    asyncComputedMock.mockClear();
    nowMock.mockClear();
  });

  it("forwards selected start/end/range without subscribing to an extra refresh clock", async () => {
    const di = getDiForUnitTesting();
    const request = vi.fn().mockResolvedValue({});
    const timestampsGet = vi.fn(() => ({ start: 2000, end: 2100, range: 100 }));
    const object: TestObject = {
      getId: () => "resource-id",
    };

    const injectable = createTimeRangedMetricsInjectable<{ object: TestObject }, TestObject, unknown>({
      id: "test-time-ranged-metrics",
      getObject: ({ object }) => object,
      getObjectId: (resource) => resource.getId(),
      request: async ({ object, start, end, range }) => request({ object, start, end, range }),
    });
    type InjectableShouldNotBeAny = AssertFalse<IsAny<typeof injectable>>;
    const injectableShouldNotBeAny: InjectableShouldNotBeAny = false;

    expect(injectableShouldNotBeAny).toBe(false);

    di.register(injectable);

    di.override(
      selectedMetricsTimeRangeInjectable,
      () =>
        ({
          timestamps: {
            get: timestampsGet,
          },
        }) as never,
    );

    di.inject(injectable, {
      object,
    });
    const asyncComputedConfiguration = asyncComputedMock.mock.calls[0]?.[0] as {
      getValueFromObservedPromise: () => Promise<unknown>;
    };

    await asyncComputedConfiguration.getValueFromObservedPromise();

    expect(request).toHaveBeenCalledWith({
      object,
      start: 2000,
      end: 2100,
      range: 100,
    });
    expect(nowMock).not.toHaveBeenCalled();
    expect(timestampsGet).toHaveBeenCalled();
    expect(asyncComputedMock).toHaveBeenCalledWith(
      expect.objectContaining({
        betweenUpdates: "show-latest-value",
      }),
    );
  });

  it("keys instances by object identity", () => {
    const di = getDiForUnitTesting();
    const objectA: TestObject = {
      getId: () => "resource-a",
    };
    const objectB: TestObject = {
      getId: () => "resource-b",
    };

    const injectable = createTimeRangedMetricsInjectable<{ object: TestObject }, TestObject, unknown>({
      id: "test-time-ranged-metrics-identity",
      getObject: ({ object }) => object,
      getObjectId: (resource) => resource.getId(),
      request: async () => ({}),
    });

    di.register(injectable);

    di.override(
      selectedMetricsTimeRangeInjectable,
      () =>
        ({
          timestamps: {
            get: () => ({ start: 2000, end: 2100, range: 100 }),
          },
        }) as never,
    );

    const metricsForObjectA = di.inject(injectable, {
      object: objectA,
    });
    const metricsForObjectAAgain = di.inject(injectable, {
      object: objectA,
    });
    const metricsForObjectB = di.inject(injectable, {
      object: objectB,
    });

    expect(metricsForObjectAAgain).toBe(metricsForObjectA);
    expect(metricsForObjectB).not.toBe(metricsForObjectA);
  });

  it("resolves to undefined and exposes a classified error when the request rejects", async () => {
    const di = getDiForUnitTesting();
    const object: TestObject = {
      getId: () => "resource-id",
    };

    const injectable = createTimeRangedMetricsInjectable<{ object: TestObject }, TestObject, unknown>({
      id: "test-time-ranged-metrics-rejection",
      getObject: ({ object }) => object,
      getObjectId: (resource) => resource.getId(),
      request: async () => {
        throw new Error("metrics request failed");
      },
    });

    di.register(injectable);

    di.override(
      selectedMetricsTimeRangeInjectable,
      () =>
        ({
          timestamps: {
            get: () => ({ start: 2000, end: 2100, range: 100 }),
          },
        }) as never,
    );

    const metrics = di.inject(injectable, { object }) as unknown as {
      error: { get: () => unknown };
    };
    const asyncComputedConfiguration = asyncComputedMock.mock.calls[0]?.[0] as {
      getValueFromObservedPromise: () => Promise<unknown>;
    };

    await expect(asyncComputedConfiguration.getValueFromObservedPromise()).resolves.toBeUndefined();

    expect(metrics.error.get()).toEqual({ reason: "error", message: "metrics request failed" });
  });

  it("clears a previously classified error once a subsequent request succeeds", async () => {
    const di = getDiForUnitTesting();
    const object: TestObject = {
      getId: () => "resource-id",
    };
    const request = vi
      .fn()
      .mockRejectedValueOnce(new Error("metrics request failed"))
      .mockResolvedValueOnce({ ok: true });

    const injectable = createTimeRangedMetricsInjectable<{ object: TestObject }, TestObject, unknown>({
      id: "test-time-ranged-metrics-recovery",
      getObject: ({ object }) => object,
      getObjectId: (resource) => resource.getId(),
      request: async () => request(),
    });

    di.register(injectable);

    di.override(
      selectedMetricsTimeRangeInjectable,
      () =>
        ({
          timestamps: {
            get: () => ({ start: 2000, end: 2100, range: 100 }),
          },
        }) as never,
    );

    const metrics = di.inject(injectable, { object }) as unknown as {
      error: { get: () => unknown };
    };
    const asyncComputedConfiguration = asyncComputedMock.mock.calls[0]?.[0] as {
      getValueFromObservedPromise: () => Promise<unknown>;
    };

    await asyncComputedConfiguration.getValueFromObservedPromise();

    expect(metrics.error.get()).toEqual({ reason: "error", message: "metrics request failed" });

    const value = await asyncComputedConfiguration.getValueFromObservedPromise();

    expect(value).toEqual({ ok: true });
    expect(metrics.error.get()).toBeUndefined();
  });
});
