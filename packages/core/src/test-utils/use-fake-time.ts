/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { act } from "@testing-library/react";

let usingFakeTime = false;

export const advanceFakeTime = (milliseconds: number) => {
  if (!usingFakeTime) {
    throw new Error("Tried to advance fake time but it was not enabled. Call useFakeTime() first.");
  }

  act(() => {
    vi.advanceTimersByTime(milliseconds);
  });
};

export const testUsingFakeTime = (dateTime = "2015-10-21T07:28:00Z") => {
  usingFakeTime = true;

  // Jest faked every timer API except process.nextTick (doNotFake:
  // ["nextTick"]); Vitest's default toFake list is smaller, so the list is
  // spelled out to keep parity.
  vi.useFakeTimers({
    toFake: [
      "setTimeout",
      "clearTimeout",
      "setInterval",
      "clearInterval",
      "setImmediate",
      "clearImmediate",
      "Date",
      "performance",
      "requestAnimationFrame",
      "cancelAnimationFrame",
      "requestIdleCallback",
      "cancelIdleCallback",
      "queueMicrotask",
    ],
  });

  vi.setSystemTime(new Date(dateTime));
};
