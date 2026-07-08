/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// Replaces monaco-editor-webpack-plugin (v2 Vite build, plan D11): Monaco
// spawns its language services as web workers; Vite bundles them as module
// workers through the `?worker` import qualifier and Monaco receives them
// through the MonacoEnvironment global. Only "json" has a dedicated worker;
// "yaml" is a basic language and is serviced by the editor worker.

import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import JsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";

self.MonacoEnvironment = {
  getWorker: (_workerId, label) => (label === "json" ? new JsonWorker() : new EditorWorker()),
};
