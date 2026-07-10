/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// The runtime shim of `@freelensapp/extensions`, transpiled verbatim to
// `dist/extension-api.js` (see `scripts/build-shim.mjs`). It only re-exports
// `globalThis.FreelensExtensionApi`, which the app assigns at startup, so the
// emitted file has no runtime dependencies. The published types come from the
// d.ts rollup of `./extension-api.ts` instead; this file is intentionally
// untyped beyond the ambient global declared there.

const api = globalThis.FreelensExtensionApi;

export const Common = api.Common;
export const Main = api.Main!;
export const Renderer = api.Renderer!;
