/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { describe, expect, it } from "vitest";
import { defaultZoom, getNextZoomStep, getPreviousZoomStep, isZoomStep, toZoomFactor, zoomSteps } from "./zoom-steps";

describe("zoom steps", () => {
  it("are the steps of Chromium's zoom, in order", () => {
    expect(zoomSteps).toEqual([67, 75, 80, 90, 100, 110, 125, 150, 175, 200]);
  });

  it("default to 100%", () => {
    expect(defaultZoom).toBe(100);
  });

  it.each(zoomSteps)("accept %i%", (step) => {
    expect(isZoomStep(step)).toBe(true);
  });

  it.each([0, 50, 99, 101, 250, "100", undefined, null])("reject %s", (value) => {
    expect(isZoomStep(value)).toBe(false);
  });

  it.each(zoomSteps.slice(0, -1).map((step, index) => [step, zoomSteps[index + 1]]))(
    "zoom in from %i% to %i%",
    (from, to) => {
      expect(getNextZoomStep(from)).toBe(to);
    },
  );

  it.each(zoomSteps.slice(1).map((step, index) => [step, zoomSteps[index]]))("zoom out from %i% to %i%", (from, to) => {
    expect(getPreviousZoomStep(from)).toBe(to);
  });

  it("stay at the last step when zooming in from it", () => {
    expect(getNextZoomStep(200)).toBe(200);
  });

  it("stay at the first step when zooming out from it", () => {
    expect(getPreviousZoomStep(67)).toBe(67);
  });

  it("move from a zoom between two steps to the nearest step in the direction", () => {
    expect(getNextZoomStep(105)).toBe(110);
    expect(getPreviousZoomStep(105)).toBe(100);
  });

  it("turn a zoom in percent into Electron's zoom factor", () => {
    expect(toZoomFactor(100)).toBe(1);
    expect(toZoomFactor(125)).toBe(1.25);
  });
});
