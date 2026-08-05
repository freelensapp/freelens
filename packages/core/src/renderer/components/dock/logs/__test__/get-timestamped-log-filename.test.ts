/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getTimestampedLogFilename } from "../get-timestamped-log-filename";

describe("getTimestampedLogFilename", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-21T09:55:41.123Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("appends a filesystem-safe ISO timestamp and .log extension", () => {
    expect(getTimestampedLogFilename("docker-exporter")).toBe("docker-exporter-2026-05-21T09-55-41-123Z.log");
  });
});
