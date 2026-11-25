/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// DOM must not type-check in main code. Every line under a `@ts-expect-error`
// has to fail in tsconfig.main.json; if it stops failing, the directive is
// reported as unused and `pnpm type:check` fails.

// @ts-expect-error: main code has no DOM
export const title = document.title;
// @ts-expect-error: main code has no DOM
export const href = window.location.href;
// @ts-expect-error: main code has no DOM
export const isElement = (value: unknown) => value instanceof HTMLElement;
