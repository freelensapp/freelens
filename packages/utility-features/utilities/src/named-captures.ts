/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

/**
 * The named capture groups of the first match of `regex` in `value`, or
 * `undefined` when there is no match.
 *
 * `Groups` is the caller's claim about which groups the pattern has and which
 * of them always participate in a match; nothing verifies it against the
 * pattern, so keep the two next to each other.
 *
 * Replaces the `captures()` of the `typed-regex` package, which was last
 * released in 2021-06.
 */
export const namedCaptures = <Groups extends Record<string, string | undefined>>(
  regex: RegExp,
  value: string,
): Groups | undefined => {
  // `exec` continues from `lastIndex` on a global or sticky regex, which makes
  // repeated calls against the same regex answer differently. No caller wants
  // that, and a shared module-level regex makes it a trap.
  regex.lastIndex = 0;

  return regex.exec(value)?.groups as Groups | undefined;
};
