/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

/**
 * Compiles a search query into a case-insensitive regular expression.
 *
 * Returns undefined for a pattern the engine rejects. That is not an edge case:
 * it happens on almost every keystroke while the user types a real pattern
 * ("(", "(fo", "[a-"), so callers treat it as "no usable filter yet" rather
 * than as an error.
 *
 * The `g` flag is deliberately omitted. `RegExp.test` advances `lastIndex` on a
 * global regex, so reusing one instance across a list of items would skip
 * roughly every other match.
 */
export function compileSearchRegex(query: string): RegExp | undefined {
  try {
    return new RegExp(query, "i");
  } catch {
    return undefined;
  }
}
