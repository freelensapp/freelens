/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// Node APIs, which renderer code and common code must not reach. Compiled with
// the renderer and the common configs, where every marked line has to fail:
// `@ts-expect-error` inverts the check, so a config that starts letting one of
// them through fails `type:check` with an unused directive instead.
//
// Every name is exported rather than merely declared, so that a line which
// stops failing for the right reason cannot go on failing for an unused local.

// @ts-expect-error a Node builtin, which a browser page does not have
export { readFileSync } from "node:fs";

// @ts-expect-error a side-effect import is checked only under `noUncheckedSideEffectImports`
import "node:fs";

// @ts-expect-error a Node global
export const buffer = Buffer.from("fixture");

// @ts-expect-error a Node global
export const home = process.env.HOME;
