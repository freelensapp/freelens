/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

/**
 * This is like an `AbortController` but will also abort if the parent aborts,
 * but won't make the parent abort if this aborts (single direction)
 */
export class WrappedAbortController extends AbortController {
  constructor(parent?: AbortController | undefined) {
    super();

    parent?.signal.addEventListener("abort", () => {
      this.abort();
    });
  }
}

export function setTimeoutFor(controller: AbortController, timeout: number): void {
  const handle = setTimeout(() => controller.abort(), timeout);

  controller.signal.addEventListener("abort", () => clearTimeout(handle));
}

export function chainSignal(target: AbortController, signal: AbortSignal) {
  if (signal.aborted) {
    target.abort();
  } else {
    signal.addEventListener("abort", (event) => target.abort(event));
  }
}
