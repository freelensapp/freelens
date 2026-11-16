/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { computeNextPosition } from "./helpers";
import { TooltipPosition } from "./tooltip";

const viewport = { width: 1000, height: 800 };
const tooltip = { getBoundingClientRect: () => ({ width: 100, height: 30 }) };

const targetAt = (left: number, top: number) => ({
  getBoundingClientRect: () => ({ left, top, width: 20, height: 20, right: left + 20, bottom: top + 20 }),
});

describe("computeNextPosition", () => {
  beforeEach(() => {
    window.innerWidth = viewport.width;
    window.innerHeight = viewport.height;
  });

  const positionFor = (target: ReturnType<typeof targetAt>, preferredPositions?: TooltipPosition | TooltipPosition[]) =>
    computeNextPosition({ offset: 10, preferredPositions, target, tooltip }).position;

  it("shows on the right without a preference", () => {
    expect(positionFor(targetAt(500, 400))).toBe(TooltipPosition.RIGHT);
  });

  it("takes a single preferred position", () => {
    expect(positionFor(targetAt(500, 400), TooltipPosition.TOP)).toBe(TooltipPosition.TOP);
  });

  it("takes the first position of a list", () => {
    expect(positionFor(targetAt(500, 400), [TooltipPosition.TOP, TooltipPosition.BOTTOM])).toBe(TooltipPosition.TOP);
  });

  it("takes the next position of a list when the first does not fit", () => {
    expect(positionFor(targetAt(500, 0), [TooltipPosition.TOP, TooltipPosition.BOTTOM_LEFT])).toBe(
      TooltipPosition.BOTTOM_LEFT,
    );
  });

  it("falls back to the default order when no preferred position fits", () => {
    // Right of a target at the top edge reaches above the window too, so the default order goes on to bottom.
    expect(positionFor(targetAt(500, 0), [TooltipPosition.TOP, TooltipPosition.TOP_LEFT])).toBe(TooltipPosition.BOTTOM);
  });
});
