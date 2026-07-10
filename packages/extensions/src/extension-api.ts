/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// Phase 4 (D5): `@freelensapp/extensions` is a thin runtime shim over the
// extension API. The app assigns the API object to a global at startup
// (`globalThis.FreelensExtensionApi`, see `freelens/src/{main,renderer}/index.ts`).
// Extensions depend on this package for types; at runtime the members resolve
// to the global regardless of whether an extension bundles this shim or marks
// it external.
//
// The type-only imports below give extension authors the full API surface for
// every process. At runtime `Main` is undefined in the renderer and `Renderer`
// is undefined in the main process; extensions only touch the namespace for the
// process they run in.
//
// TODO(D5): the published package ships a rolled-up, self-contained `.d.ts`
// (e.g. `rollup-plugin-dts`) with no `@freelensapp/*` imports, since internal
// packages become `private` in Phase 5. That declaration emit is the fiddliest
// deliverable of this phase (see plan §6) and needs local iteration.

/// <reference path="../../core/types/mocks.d.ts" />

import type { commonExtensionApi, mainExtensionApi } from "@freelensapp/core/main";
import type { rendererExtensionApi } from "@freelensapp/core/renderer";

declare global {
  // eslint-disable-next-line no-var
  var FreelensExtensionApi: {
    Common: typeof commonExtensionApi;
    Main?: typeof mainExtensionApi;
    Renderer?: typeof rendererExtensionApi;
  };
}

const api = globalThis.FreelensExtensionApi;

export const Common = api.Common;
export const Main = api.Main as typeof mainExtensionApi;
export const Renderer = api.Renderer as typeof rendererExtensionApi;
