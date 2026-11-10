/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// Node must not type-check in renderer code. Every line under a
// `@ts-expect-error` has to fail in tsconfig.renderer.json; if it stops
// failing, the directive is reported as unused and `pnpm type:check` fails.

// @ts-expect-error: renderer code has no Node builtins
import "node:fs";
// @ts-expect-error: renderer code has no Node builtins
import { join } from "node:path";

// @ts-expect-error: renderer code has no Buffer
export const buffer = Buffer.from("");
// @ts-expect-error: renderer code has no process
export const env = process.env;

export { join };
