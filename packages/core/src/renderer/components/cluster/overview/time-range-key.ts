/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { MetricsTimeRange } from "./metrics-time-range-storage.injectable";

export function createMetricsTimeRangeKey({ duration, customStart, customEnd }: MetricsTimeRange) {
  if (duration !== null) {
    return `duration-${duration}`;
  }

  return `custom-${customStart}-${customEnd}`;
}
