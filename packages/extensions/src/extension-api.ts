/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// Phase 4 (D5): the type-level entry of `@freelensapp/extensions`. The
// published package pairs the d.ts rollup of this module with the runtime
// shim (`./runtime-shim.ts`, emitted as `dist/extension-api.js`), which
// resolves the same members from `globalThis.FreelensExtensionApi` at
// runtime. The app assigns that global at startup (see
// `freelens/src/{main,renderer}/index.ts`).
//
// `Common`, `Main`, and `Renderer` are re-exported as namespaces (not consts)
// so extension authors can use them in type positions —
// `Renderer.Component.IconProps`, `Common.PackageJson` — exactly as with the
// v1 extension API. At runtime `Main` is undefined in the renderer and
// `Renderer` is undefined in the main process; extensions only touch the
// namespace for the process they run in.
//
// This module is never executed in the workspace (the package's runtime entry
// everywhere is the shim); it exists for declaration emit and workspace type
// resolution only.

/// <reference path="../../core/types/mocks.d.ts" />

import type { commonExtensionApi, mainExtensionApi } from "@freelensapp/core/main";
import type { rendererExtensionApi } from "@freelensapp/core/renderer";

export { commonExtensionApi as Common, mainExtensionApi as Main } from "@freelensapp/core/main";
export { rendererExtensionApi as Renderer } from "@freelensapp/core/renderer";

declare global {
  // eslint-disable-next-line no-var
  var FreelensExtensionApi: {
    Common: typeof commonExtensionApi;
    Main?: typeof mainExtensionApi;
    Renderer?: typeof rendererExtensionApi;
  };
}
