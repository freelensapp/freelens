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
 * Besides the plain substring match, a value also matches when it contains the query once
 * dashes and underscores are removed from both, so `nginxingress` and `nginx-ingress`
 * find each other.
 */
export function createSearchMatcher(search: string): (value: Primitive) => boolean {
  const query = normalizeText(search);
  const strippedQuery = stripSeparators(query);

  return (value) => {
    const text = normalizeText(value);

    return text.includes(query) || (strippedQuery !== "" && stripSeparators(text).includes(strippedQuery));
  };
}
