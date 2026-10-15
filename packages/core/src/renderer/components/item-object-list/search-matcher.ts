/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { Primitive } from "type-fest";

const separators = /[-_]/g;

function normalizeText(value: Primitive) {
  return String(value).toLowerCase();
}

function stripSeparators(text: string) {
  return text.replace(separators, "");
}

/**
 * Creates a case-insensitive substring matcher for a search query.
 *
 * Besides the plain substring match, a value also matches when its text with dashes and
 * underscores removed contains the query. Separators in the query stay literal, so
 * `nginxingress` finds `nginx-ingress`, while `nginx-ingress` does not find `nginxingress`.
 */
export function createSearchMatcher(search: string): (value: Primitive) => boolean {
  const query = normalizeText(search);

  return (value) => {
    const text = normalizeText(value);

    return text.includes(query) || stripSeparators(text).includes(query);
  };
}
