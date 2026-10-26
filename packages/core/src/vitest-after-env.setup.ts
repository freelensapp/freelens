/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { createRequire } from "node:module";
import { afterAll, vi } from "vitest";
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

// A React update made outside `act` (a MobX change in a `beforeEach`, say) is
// rendered by React's scheduler instead of the `act` queue. In Node the
// scheduler runs its work from `setImmediate`, and a commit queues one more
// task that flushes the passive effects and starts by reading `window.event`.
// When that task is still pending after the last test, Vitest can tear the
// jsdom environment down first, and the task then throws "window is not
// defined" as an unhandled error, which fails the run although every test
// passed. An idle-priority task runs only after all the work React has queued,
// including whatever the passive effects queue in turn, so waiting for one
// lets React finish while `window` still exists.
//
// The scheduler is resolved from react-dom's own directory so that it is the
// instance react-dom uses, without core depending on it directly.
interface ReactScheduler {
  unstable_IdlePriority: number;
  unstable_scheduleCallback: (priority: number, callback: () => void) => unknown;
}

const reactDomRequire = createRequire(createRequire(import.meta.url).resolve("react-dom"));
const reactScheduler = reactDomRequire("scheduler") as ReactScheduler;

afterAll(
  () =>
    new Promise<void>((resolve) => {
      reactScheduler.unstable_scheduleCallback(reactScheduler.unstable_IdlePriority, () => resolve());
    }),
);
