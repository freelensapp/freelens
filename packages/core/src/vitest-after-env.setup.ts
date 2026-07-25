/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "@testing-library/jest-dom/vitest";

// Note: This is a kludge to prevent "Hooks cannot be defined inside tests" error
// when importing a test util inside a test suite.
import { render } from "@testing-library/react";

void render;

// Testing-library detects fake timers and drives them itself inside `waitFor`
// (via `jest.advanceTimersByTime`, wrapped in `act` through React Testing
// Library's `unstable_advanceTimersWrapper`). That path only activates when a
// `jest` global exists (see `jestFakeTimersAreEnabled` in
// @testing-library/dom): otherwise `waitFor` falls back to a real-timer
// `setInterval` poll, which deadlocks under our fully-faked timers
// (`testUsingFakeTime`). Vitest's Sinon fake timers already expose the `clock`
// marker testing-library looks for, so the only missing piece is a minimal
// `jest` shim mapping the timer helpers `waitFor` uses onto `vi`.
if (typeof (globalThis as any).jest === "undefined") {
  (globalThis as any).jest = {
    advanceTimersByTime: (ms: number) => vi.advanceTimersByTime(ms),
  };
}
