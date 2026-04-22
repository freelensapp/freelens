/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { createMetricsTimeRangeKey } from "./time-range-key";

describe("createMetricsTimeRangeKey", () => {
  it("creates a duration key for predefined ranges", () => {
    expect(createMetricsTimeRangeKey({ duration: 3600 })).toBe("duration-3600");
  });

  it("creates a boundary-based key for custom ranges", () => {
    expect(createMetricsTimeRangeKey({ duration: null, customStart: 100, customEnd: 200 })).toBe("custom-100-200");
  });

  it("falls back for incomplete custom ranges", () => {
    expect(createMetricsTimeRangeKey({ duration: null, customStart: 100 })).toBe("custom-active");
  });
});
