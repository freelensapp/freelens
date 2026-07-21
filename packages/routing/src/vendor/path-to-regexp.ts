/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

/**
 * Vendored port of `path-to-regexp` v1.9.0 (the last release of the 1.x line,
 * which carries the security-patched ReDoS fix GHSA-9wv6-86v2-598j).
 *
 * Upstream: https://github.com/pillarjs/path-to-regexp/blob/v1.9.0/index.js
 * License:  MIT (c) 2014 Blake Embrey (hello@blakeembrey.com)
 *
 * `path-to-regexp` v1 is the engine `react-router` 5 bundled internally and the
 * dialect Freelens' route schemas are authored against (`/:param?` optionals and
 * inline `/:param(regex)` patterns, neither of which `path-to-regexp` v8 can
 * express). Rather than depend on an unmaintained package — and to close the
 * whole class of Vite version-collision bugs where a single bare `path-to-regexp`
 * specifier collapsed to a v8 that then crashed on v1-dialect paths — the source
 * is vendored here so the v1 dialect stays the routing contract and we own the
 * code. See `docs/v2-routing-modernization.md`.
 *
 * Deliberately faithful to upstream so it can be diffed against v1.9.0. Only the
 * following changes were made:
 *   - converted to TypeScript / ESM with named exports;
 *   - `require('isarray')` replaced by the native `Array.isArray`;
 *   - the unused path-*building* helpers were dropped (`compile`,
 *     `tokensToFunction`, `encodeURIComponentPretty`, `encodeAsterisk`) — this
 *     port is only used for matching (string -> RegExp), never for compiling a
 *     path back from params.
 */

/**
 * The main path matching regexp utility.
 */
const PATH_REGEXP = new RegExp(
  [
    // Match escaped characters that would otherwise appear in future matches.
    // This allows the user to escape special characters that won't transform.
    "(\\\\.)",
    // Match Express-style parameters and un-named parameters with a prefix
    // and optional suffixes. Matches appear as:
    //
    // "/:test(\\d+)?" => ["/", "test", "\d+", undefined, "?", undefined]
    // "/route(\\d+)"  => [undefined, undefined, undefined, "\d+", undefined, undefined]
    // "/*"            => ["/", undefined, undefined, undefined, undefined, "*"]
    "([\\/.])?(?:(?:\\:(\\w+)(?:\\(((?:\\\\.|[^\\\\()])+)\\))?|\\(((?:\\\\.|[^\\\\()])+)\\))([+*?])?|(\\*))",
  ].join("|"),
  "g",
);

export interface RegExpOptions {
  /** When `true` the route will be case sensitive. (default: `false`) */
  sensitive?: boolean;
  /** When `false` the trailing slash is optional. (default: `false`) */
  strict?: boolean;
  /** When `false` the path will match at the beginning. (default: `true`) */
  end?: boolean;
  /** Sets the final character for non-ending optimistic matches. (default: `/`) */
  delimiter?: string;
}

export interface ParseOptions {
  /** Set the default delimiter for repeat parameters. (default: `'/'`) */
  delimiter?: string;
}

export interface Key {
  name: string | number;
  prefix: string | null;
  delimiter: string | null;
  optional: boolean;
  repeat: boolean;
  pattern: string | null;
  partial: boolean;
  asterisk: boolean;
}

export type Token = string | Key;
export type Path = string | RegExp | Array<string | RegExp>;

export interface PathRegExp extends RegExp {
  /** The keys found in the path, populated during compilation. */
  keys: Key[];
}

/**
 * Parse a string for the raw tokens.
 */
export function parse(str: string, options?: ParseOptions): Token[] {
  const tokens: Token[] = [];
  let key = 0;
  let index = 0;
  let path = "";
  const defaultDelimiter = (options && options.delimiter) || "/";
  let res: RegExpExecArray | null;

  while ((res = PATH_REGEXP.exec(str)) != null) {
    const m = res[0];
    const escaped = res[1];
    const offset = res.index;
    path += str.slice(index, offset);
    index = offset + m.length;

    // Ignore already escaped sequences.
    if (escaped) {
      path += escaped[1];
      continue;
    }

    const next = str[index];
    const prefix = res[2];
    const name = res[3];
    const capture = res[4];
    const group = res[5];
    const modifier = res[6];
    const asterisk = res[7];

    // Push the current path onto the tokens.
    if (path) {
      tokens.push(path);
      path = "";
    }

    const partial = prefix != null && next != null && next !== prefix;
    const repeat = modifier === "+" || modifier === "*";
    const optional = modifier === "?" || modifier === "*";
    const delimiter = prefix || defaultDelimiter;
    const pattern = capture || group;
    const prevText =
      prefix || (typeof tokens[tokens.length - 1] === "string" ? (tokens[tokens.length - 1] as string) : "");

    tokens.push({
      name: name || key++,
      prefix: prefix || "",
      delimiter: delimiter,
      optional: optional,
      repeat: repeat,
      partial: partial,
      asterisk: Boolean(asterisk),
      pattern: pattern ? escapeGroup(pattern) : asterisk ? ".*" : restrictBacktrack(delimiter, prevText),
    });
  }

  // Match any characters still remaining.
  if (index < str.length) {
    path += str.substr(index);
  }

  // If the path exists, push it onto the end.
  if (path) {
    tokens.push(path);
  }

  return tokens;
}

function restrictBacktrack(delimiter: string, prevText: string): string {
  if (!prevText || prevText.indexOf(delimiter) > -1) {
    return "[^" + escapeString(delimiter) + "]+?";
  }

  return escapeString(prevText) + "|(?:(?!" + escapeString(prevText) + ")[^" + escapeString(delimiter) + "])+?";
}

/**
 * Escape a regular expression string.
 */
function escapeString(str: string): string {
  return str.replace(/([.+*?=^!:${}()[\]|\/\\])/g, "\\$1");
}

/**
 * Escape the capturing group by escaping special characters and meaning.
 */
function escapeGroup(group: string): string {
  return group.replace(/([=!:$\/()])/g, "\\$1");
}

/**
 * Attach the keys as a property of the regexp.
 */
function attachKeys(re: RegExp, keys: Key[]): PathRegExp {
  (re as PathRegExp).keys = keys;
  return re as PathRegExp;
}

/**
 * Get the flags for a regexp from the options.
 */
function flags(options?: RegExpOptions): string {
  return options && options.sensitive ? "" : "i";
}

/**
 * Pull out keys from a regexp.
 */
function regexpToRegexp(path: RegExp, keys: Key[]): PathRegExp {
  // Use a negative lookahead to match only capturing groups.
  const groups = path.source.match(/\((?!\?)/g);

  if (groups) {
    for (let i = 0; i < groups.length; i++) {
      keys.push({
        name: i,
        prefix: null,
        delimiter: null,
        optional: false,
        repeat: false,
        partial: false,
        asterisk: false,
        pattern: null,
      });
    }
  }

  return attachKeys(path, keys);
}

/**
 * Transform an array into a regexp.
 */
function arrayToRegexp(path: Array<string | RegExp>, keys: Key[], options?: RegExpOptions & ParseOptions): PathRegExp {
  const parts: string[] = [];

  for (let i = 0; i < path.length; i++) {
    parts.push(pathToRegexp(path[i], keys, options).source);
  }

  const regexp = new RegExp("(?:" + parts.join("|") + ")", flags(options));

  return attachKeys(regexp, keys);
}

/**
 * Create a path regexp from string input.
 */
function stringToRegexp(path: string, keys: Key[], options?: RegExpOptions & ParseOptions): PathRegExp {
  return tokensToRegExp(parse(path, options), keys, options);
}

/**
 * Expose a function for taking tokens and returning a RegExp.
 */
export function tokensToRegExp(tokens: Token[], keys?: Key[] | RegExpOptions, options?: RegExpOptions): PathRegExp {
  if (!Array.isArray(keys)) {
    options = (keys || options) as RegExpOptions | undefined;
    keys = [];
  }

  options = options || {};

  const strict = options.strict;
  const end = options.end !== false;
  let route = "";

  // Iterate over the tokens and create our regexp string.
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (typeof token === "string") {
      route += escapeString(token);
    } else {
      const prefix = escapeString(token.prefix ?? "");
      let capture = "(?:" + token.pattern + ")";

      keys.push(token);

      if (token.repeat) {
        capture += "(?:" + prefix + capture + ")*";
      }

      if (token.optional) {
        if (!token.partial) {
          capture = "(?:" + prefix + "(" + capture + "))?";
        } else {
          capture = prefix + "(" + capture + ")?";
        }
      } else {
        capture = prefix + "(" + capture + ")";
      }

      route += capture;
    }
  }

  const delimiter = escapeString(options.delimiter || "/");
  const endsWithDelimiter = route.slice(-delimiter.length) === delimiter;

  // In non-strict mode we allow a slash at the end of match. If the path to
  // match already ends with a slash, we remove it for consistency. The slash
  // is valid at the end of a path match, not in the middle. This is important
  // in non-ending mode, where "/test/" shouldn't match "/test//route".
  if (!strict) {
    route = (endsWithDelimiter ? route.slice(0, -delimiter.length) : route) + "(?:" + delimiter + "(?=$))?";
  }

  if (end) {
    route += "$";
  } else {
    // In non-ending mode, we need the capturing groups to match as much as
    // possible by using a positive lookahead to the end or next path segment.
    route += strict && endsWithDelimiter ? "" : "(?=" + delimiter + "|$)";
  }

  return attachKeys(new RegExp("^" + route, flags(options)), keys);
}

/**
 * Normalize the given path string, returning a regular expression.
 *
 * An empty array can be passed in for the keys, which will hold the
 * placeholder key descriptions. For example, using `/user/:id`, `keys` will
 * contain `[{ name: 'id', delimiter: '/', optional: false, repeat: false }]`.
 */
export function pathToRegexp(path: Path, options?: RegExpOptions & ParseOptions): PathRegExp;
export function pathToRegexp(path: Path, keys?: Key[], options?: RegExpOptions & ParseOptions): PathRegExp;
export function pathToRegexp(
  path: Path,
  keys?: Key[] | (RegExpOptions & ParseOptions),
  options?: RegExpOptions & ParseOptions,
): PathRegExp {
  if (!Array.isArray(keys)) {
    options = (keys || options) as (RegExpOptions & ParseOptions) | undefined;
    keys = [];
  }

  options = options || {};

  if (path instanceof RegExp) {
    return regexpToRegexp(path, keys);
  }

  if (Array.isArray(path)) {
    return arrayToRegexp(path, keys, options);
  }

  return stringToRegexp(path, keys, options);
}
