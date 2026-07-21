/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

const asyncComputedMock = vi.fn((options: unknown) => options);

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
    now: () => {},
  };
});

import { loggerInjectionToken } from "@freelensapp/logger";
import requestClusterMetricsByNodeNamesInjectable from "../../../common/k8s-api/endpoints/metrics.api/request-cluster-metrics-by-node-names.injectable";
import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import clusterOverviewMetricsInjectable from "./cluster-metrics.injectable";
import selectedMetricsTimeRangeInjectable from "./overview/selected-metrics-time-range.injectable";
import selectedNodeRoleForMetricsInjectable from "./overview/selected-node-role-for-metrics.injectable";

import type { Logger } from "@freelensapp/logger";

import type { Mocked } from "vitest";

describe("clusterOverviewMetricsInjectable", () => {
  beforeEach(() => {
    asyncComputedMock.mockClear();
  });

  it("resolves to an empty object instead of rejecting when the request fails", async () => {
    const di = getDiForUnitTesting();
    const loggerMock: Mocked<Logger> = {
      warn: vi.fn(),
      debug: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      silly: vi.fn(),
    };

    di.override(loggerInjectionToken, () => loggerMock);
    di.override(
      selectedNodeRoleForMetricsInjectable,
      () =>
        ({
          nodes: { get: () => [] },
        }) as never,
    );
    di.override(
      selectedMetricsTimeRangeInjectable,
      () =>
        ({
          timestamps: { get: () => ({ start: 2000, end: 2100, range: 100 }) },
        }) as never,
    );
    di.override(requestClusterMetricsByNodeNamesInjectable, () => vi.fn().mockRejectedValue(new Error("boom")));

    di.inject(clusterOverviewMetricsInjectable);

    const asyncComputedConfiguration = asyncComputedMock.mock.calls[0]?.[0] as {
      getValueFromObservedPromise: () => Promise<unknown>;
    };

    await expect(asyncComputedConfiguration.getValueFromObservedPromise()).resolves.toEqual({});
    expect(loggerMock.debug).toHaveBeenCalled();
  });
});
