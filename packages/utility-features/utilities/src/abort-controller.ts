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

/**
 * Returns `true` if `error` represents an aborted operation rather than a real
 * failure. Aborting a `fetch` rejects with a `DOMException` named `AbortError`,
 * but the kube watch/list paths surface more than one abort shape, so this also
 * matches any error-like object whose `name` is `AbortError` or whose `type` is
 * `"aborted"`.
 */
export function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException) {
    return error.name === "AbortError" || error.code === DOMException.ABORT_ERR;
  }

  if (typeof error === "object" && error !== null) {
    const { name, type } = error as { name?: unknown; type?: unknown };

    return name === "AbortError" || type === "aborted";
  }

  return false;
}
