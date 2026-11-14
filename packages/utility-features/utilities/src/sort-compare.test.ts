/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { describe, expect, it } from "vitest";
import { Ordering, sortCompare } from "./sort-compare";

describe("sortCompare", () => {
  it("returns Equal only for equal strings", () => {
    expect(sortCompare("job01", "job1")).toBe(Ordering.LESS);
    expect(sortCompare("job1", "job01")).toBe(Ordering.GREATER);
    expect(sortCompare("job1", "job1")).toBe(Ordering.EQUAL);
  });
});
