/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// Worker globals that Node does not have. The common config accepts them,
// because its `WebWorker` lib is only an approximation of what both runtimes
// share, so common code that uses one compiles there and fails in main. That
// is why `src/main/tsconfig.json` includes `src/common/` as well: compiled
// with the main config, every marked line has to fail.

// @ts-expect-error a worker global, which the main process does not have
export const scope = self;

// @ts-expect-error a worker global, which the main process does not have
export const post = postMessage;
