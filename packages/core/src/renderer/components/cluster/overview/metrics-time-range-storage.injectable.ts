/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import createStorageInjectable from "../../../utils/create-storage/create-storage.injectable";

export interface MetricsTimeRange {
  /**
   * Duration in seconds (1h = 3600, 2h = 7200, etc.)
   * null means custom time range
   */
  duration: number | null;

  /**
   * Custom start timestamp (unix seconds)
   * Only used when duration is null
   */
  customStart?: number;

  /**
   * Custom end timestamp (unix seconds)
   * Only used when duration is null
   */
  customEnd?: number;
}

const metricsTimeRangeStorageInjectable = getInjectable({
  id: "metrics-time-range-storage",
  instantiate: (di) => {
    const createStorage = di.inject(createStorageInjectable);

    return createStorage<MetricsTimeRange>("metrics_time_range", {
      duration: 3600, // Default: 1 hour
      customStart: undefined,
      customEnd: undefined,
    });
  },
});

export default metricsTimeRangeStorageInjectable;
