/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// The singleton half of `globalThis.FreelensExtensionApi`, as one type, so the
// two ambient declarations of that global -- `freelens/src/freelens-extension-api.ts`
// for the application and `packages/extensions/src/extension-api.ts` for the
// published package -- describe the same shape from the same source instead of
// each listing it.
//
// Type-only: it names both process maps without either process importing the
// other's modules.

import type { mainExtensionApiSingletons } from "./main-singletons";
import type { rendererExtensionApiSingletons } from "./renderer-singletons";

/**
 * Required members are published by every process; optional members are
 * published by the renderer only, which is the same convention the `Main` and
 * `Renderer` namespaces on that global already follow.
 */
export type ExtensionApiSingletonsOnGlobal = typeof mainExtensionApiSingletons &
  Partial<typeof rendererExtensionApiSingletons>;
