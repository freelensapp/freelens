/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// DOM APIs, which main code and common code must not reach. Compiled with the
// main and the common configs, where every marked line has to fail: see
// `node-apis.ts` for how the check is inverted.

// @ts-expect-error the DOM, which the main process does not have
export const title = document.title;

// @ts-expect-error the DOM, which the main process does not have
export const origin = window.location.origin;
