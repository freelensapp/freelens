/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// Stands in for @types/node in the renderer type-check program
// (tsconfig.renderer.json lists this directory in `typeRoots`).
//
// `types: []` alone does not keep Node out of that program: declaration files
// it reaches, such as winston's, electron's and undici's, carry
// `/// <reference types="node" />`, and each one would load the real
// @types/node with its globals and its `node:*` modules. Such a directive
// resolves through `typeRoots` first, so it lands here instead, and the
// program sees no Node at all.

export {};
