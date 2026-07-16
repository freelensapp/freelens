/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// `await-lock` is a CommonJS module that exports its class via `exports.default`
// (`{ __esModule: true, default: AwaitLock }`). Bundlers disagree on what a
// default import of such a module binds to:
//
// - With TypeScript's `esModuleInterop` / a classic bundler, `import AwaitLock
//   from "await-lock"` binds directly to the class.
// - Under Node-mode ESM interop — which rolldown/esbuild use for the Electron
//   main (Node) target, and which electron-vite v6 + Vite 8 now also emit for
//   the renderer — the default import binds to the whole `module.exports`
//   object, leaving the class one `.default` deeper (`__toESM(require(...), 1)`).
//   `new AwaitLock()` then throws "import_AwaitLock.default is not a
//   constructor" because the binding is `{ __esModule, default: class }`.
//
// Normalize both shapes to the constructor here so call sites can just do
// `new AwaitLock()` regardless of how the module is bundled.
import AwaitLockImport from "await-lock";

type AwaitLockConstructor = typeof AwaitLockImport;

const AwaitLock = ((AwaitLockImport as unknown as { default?: AwaitLockConstructor }).default ??
  AwaitLockImport) as AwaitLockConstructor;

export default AwaitLock;
