/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import createStorageInjectable from "../../../utils/create-storage/create-storage.injectable";

export interface DurationMetricsTimeRange {
  /**
   * Duration in seconds (1h = 3600, 2h = 7200, etc.)
   * null means custom time range
   */
  duration: number;

  /**
   * Custom start timestamp (unix seconds)
   * Not used for predefined durations
   */
  customStart?: undefined;

  /**
   * Custom end timestamp (unix seconds)
   * Not used for predefined durations
   */
  customEnd?: undefined;
}

export interface CustomMetricsTimeRange {
  duration: null;
  customStart: number;
  customEnd: number;
}

export type MetricsTimeRange = DurationMetricsTimeRange | CustomMetricsTimeRange;

export const defaultMetricsTimeRange: DurationMetricsTimeRange = {
  duration: 3600,
  customStart: undefined,
  customEnd: undefined,
};

const metricsTimeRangeStorageInjectable = getInjectable({
  id: "metrics-time-range-storage",
  instantiate: (di) => {
    const createStorage = di.inject(createStorageInjectable);

    return createStorage<MetricsTimeRange>("metrics_time_range", defaultMetricsTimeRange);
  },
});

export default metricsTimeRangeStorageInjectable;
