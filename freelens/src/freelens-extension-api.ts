/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// Phase 4 (D5): ambient type for the extension API runtime global assigned by
// the main and renderer entrypoints (`globalThis.FreelensExtensionApi`).
// `Main` is present only in the main process, `Renderer` only in the renderer;
// `Common` is present in both. This module is picked up by the freelens
// tsconfig `include` so the declaration applies across both entrypoints without
// a `.d.ts` (which the repo `.gitignore` treats as a build artifact).
//
// #2450: the global also carries the singletons -- the modules an extension
// shares with the host instead of bundling. They follow the same convention as
// the namespaces: what every process publishes is required, what only the
// renderer publishes is optional. `ExtensionApiSingletonsOnGlobal` is that
// shape, and it is shared with the published package's copy of this declaration
// (`packages/extensions/src/extension-api.ts`) so the two cannot disagree.

import type { commonExtensionApi, ExtensionApiSingletonsOnGlobal, mainExtensionApi } from "@freelensapp/core/main";
import type { rendererExtensionApi } from "@freelensapp/core/renderer";

declare global {
  // eslint-disable-next-line no-var
  var FreelensExtensionApi: {
    Common: typeof commonExtensionApi;
    Main?: typeof mainExtensionApi;
    Renderer?: typeof rendererExtensionApi;
  } & ExtensionApiSingletonsOnGlobal;
}

export {};
