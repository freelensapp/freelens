/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// Common code is in both programs, so neither DOM nor Node may type-check in
// it. Each line under a `@ts-expect-error` pairs a DOM API, which only
// tsconfig.main.json rejects, with a Node API, which only
// tsconfig.renderer.json rejects, so the directive fails as unused in whichever
// program stops rejecting its half.

// @ts-expect-error: common code has neither DOM nor Node
export const loadFileSystem = () => [import("node:fs"), document];
// @ts-expect-error: common code has neither DOM nor Node
export const nameLength = Buffer.byteLength(window.name);
