/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// The globals common code may use, as the extension migration guide lists
// them. Compiled with all three configs, where all of it has to pass: a config
// that loses one of them breaks code that is valid in both runtimes.

export const id = globalThis.crypto.randomUUID();
export const bytes = new TextEncoder().encode("fixture");
export const text = new TextDecoder().decode(bytes);
export const url = new URL("https://fixture.invalid/path?query=1");
export const query = new URLSearchParams(url.search).get("query");
export const controller = new AbortController();
export const clone = structuredClone({ nested: [1, 2, 3] });

// The handle is a number in a browser and an object in Node, so it is kept
// opaque rather than annotated as either.
const timer = setTimeout(() => controller.abort(), 0);

clearTimeout(timer);
queueMicrotask(() => undefined);
