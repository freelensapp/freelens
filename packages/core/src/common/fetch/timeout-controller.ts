/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { formatDuration } from "@freelensapp/utilities";

/**
 * Creates an AbortController with an associated timeout
 * @param timeout The number of milliseconds before this controller will auto abort
 */
export function withTimeout(timeout: number): AbortController {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(`Operation timed out: timeout ${formatDuration(timeout)}`), timeout);

  controller.signal.addEventListener("abort", () => clearTimeout(id));

  return controller;
}

export interface StallTimeoutController {
  readonly controller: AbortController;
  /** Restarts the timer; call whenever the operation made progress */
  progressed(): void;
  /** Stops the timer; call once the operation is finished */
  done(): void;
}

/**
 * Creates an AbortController that aborts when nothing happens for `timeout`
 * milliseconds, rather than after a fixed overall deadline. A large download
 * over a slow link is legitimate and must not be killed; a connection that
 * stops delivering bytes must not hang forever.
 *
 * The timer starts armed, so a request whose headers never arrive is aborted
 * too.
 *
 * @param timeout The number of milliseconds without progress before this controller will auto abort
 */
export function withStallTimeout(timeout: number): StallTimeoutController {
  const controller = new AbortController();
  let id: ReturnType<typeof setTimeout> | undefined;

  const progressed = () => {
    clearTimeout(id);
    id = setTimeout(() => controller.abort(`Operation stalled: no progress for ${formatDuration(timeout)}`), timeout);
  };

  const done = () => clearTimeout(id);

  controller.signal.addEventListener("abort", done);
  progressed();

  return { controller, progressed, done };
}
