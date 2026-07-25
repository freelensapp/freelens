/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { pathToRegexp } from "./vendor/path-to-regexp";

import type { RegExpOptions } from "./vendor/path-to-regexp";

/**
 * Compile a route-path schema (authored in the `react-router` v5 /
 * `path-to-regexp` v1 dialect) into a matching regular expression.
 *
 * This is the public, purpose-named entry point over the vendored
 * `path-to-regexp` v1 engine, so the raw engine stays encapsulated in
 * `@freelensapp/routing`. Consumers use it to validate a schema (it throws on
 * an invalid pattern) without depending on `path-to-regexp` directly.
 *
 * @param path a route-path schema in the v1 dialect (`/:param?` optionals and
 *   inline `/:param(regex)` patterns are supported)
 * @param options `path-to-regexp` v1 matching options
 * @returns the compiled regular expression
 */
export function compileRoutePath(path: string, options?: RegExpOptions): RegExp {
  return pathToRegexp(path, options);
}
