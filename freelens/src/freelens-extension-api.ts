/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// Phase 4 (D5): ambient type for the extension API runtime global assigned by
// the main and renderer entrypoints (`globalThis.FreelensExtensionApi`).
// `Main` is present only in the main process, `Renderer` only in the renderer;
// `Common` is present in both. This module is picked up by the freelens
// tsconfig `include` so the declaration applies across both entrypoints without
// a `.d.ts` (which the repo `.gitignore` treats as a build artifact).

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

export {};
