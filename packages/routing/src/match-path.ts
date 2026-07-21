/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import pathToRegexp from "path-to-regexp";

/**
 * In-house port of `react-router` v5's `matchPath`.
 *
 * `react-router` 5 is unmaintained and blocks the React 19 upgrade (see
 * `docs/v2-routing-modernization.md`). Its `matchPath` is a thin wrapper over
 * `path-to-regexp` v1 — the very engine Freelens' route schemas are authored
 * against (`/:param?` optionals and inline `/:param(regex)` patterns, neither of
 * which the workspace's `path-to-regexp` v8 supports). This is a faithful port
 * so matching behavior stays identical while the `react-router` dependency is
 * dropped.
 */

/**
 * The subset of `react-router` v5's `RouteProps` that `matchPath` actually
 * reads. Kept structurally compatible so existing call sites (and the
 * extension-facing `isActiveRoute` API) can keep passing the same options.
 */
export interface MatchPathOptions {
  /** Path pattern(s) to match against, in the `path-to-regexp` v1 dialect. */
  path?: string | string[];
  /** When `true`, the entire pathname must match (no trailing segments). */
  exact?: boolean;
  /** When `true`, a trailing slash is significant. */
  strict?: boolean;
  /** When `true`, matching is case sensitive. */
  sensitive?: boolean;
}

/** The result of a successful {@link matchPath}, mirroring `react-router` v5's `match`. */
export interface Match<Params extends { [K in keyof Params]?: string } = {}> {
  /** The path pattern that matched. */
  path: string;
  /** The matched portion of the pathname. */
  url: string;
  /** Whether the entire pathname matched. */
  isExact: boolean;
  /** The parsed path parameters. */
  params: Params;
}

interface CompiledPath {
  regexp: RegExp;
  keys: pathToRegexp.Key[];
}

const cache: Record<string, Record<string, CompiledPath>> = {};
const cacheLimit = 10000;
let cacheCount = 0;

function compilePath(path: string, options: pathToRegexp.RegExpOptions): CompiledPath {
  const cacheKey = `${options.end}${options.strict}${options.sensitive}`;
  const pathCache = cache[cacheKey] || (cache[cacheKey] = {});

  const cached = pathCache[path];

  if (cached) {
    return cached;
  }

  const keys: pathToRegexp.Key[] = [];
  const regexp = pathToRegexp(path, keys, options);
  const result: CompiledPath = { regexp, keys };

  if (cacheCount < cacheLimit) {
    pathCache[path] = result;
    cacheCount++;
  }

  return result;
}

/**
 * Match a pathname against one or more path patterns.
 *
 * @param pathname the pathname to test (e.g. `location.pathname`)
 * @param options a path string, an array of path strings, or a
 *   {@link MatchPathOptions} object
 * @returns the {@link Match} on success, or `null` when nothing matches
 */
export function matchPath<Params extends { [K in keyof Params]?: string } = {}>(
  pathname: string,
  options: string | string[] | MatchPathOptions = {},
): Match<Params> | null {
  const normalizedOptions: MatchPathOptions =
    typeof options === "string" || Array.isArray(options) ? { path: options } : options;

  const { path, exact = false, strict = false, sensitive = false } = normalizedOptions;

  const paths = ([] as (string | undefined)[]).concat(path);

  return paths.reduce<Match<Params> | null>((matched, path) => {
    if (!path && path !== "") {
      return null;
    }

    if (matched) {
      return matched;
    }

    const { regexp, keys } = compilePath(path, { end: exact, strict, sensitive });
    const match = regexp.exec(pathname);

    if (!match) {
      return null;
    }

    const [url, ...values] = match;
    const isExact = pathname === url;

    if (exact && !isExact) {
      return null;
    }

    return {
      path,
      // `path === "/"` matches the empty string; normalize it back to `/`.
      url: path === "/" && url === "" ? "/" : url,
      isExact,
      params: keys.reduce<Record<string, string | undefined>>((memo, key, index) => {
        memo[key.name] = values[index];

        return memo;
      }, {}) as Params,
    };
  }, null);
}
