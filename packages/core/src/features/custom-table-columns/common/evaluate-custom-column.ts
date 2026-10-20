/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { formatJSONValue, safeJSONPathValue } from "@freelensapp/utilities";

import type { TableSortCallback } from "@freelensapp/list-layout";

export interface CustomColumnValue {
  /**
   * What the cell shows.
   */
  text: string;

  /**
   * What the column sorts by.
   *
   * It keeps the type of the JSON value instead of using the rendered text, so that a column of
   * numbers does not sort 10 before 9.
   */
  sortBy: ReturnType<TableSortCallback<unknown>>;
}

/**
 * Evaluating a JSONPath expression happens once per cell and, for a sortable column, once more per
 * item for every comparison pass. Cache the result per item so a list of a few thousand items does
 * not re-run the same query on every render (see #1777).
 *
 * The cache is keyed by the item instance. `KubeObjectStore.updateFromEventsBuffer` replaces an
 * item with a newly constructed object whenever a watch event modifies it, so a changed item gets a
 * fresh entry and the stale one becomes unreachable, which makes this both correct and self
 * cleaning.
 */
const valuesByItem = new WeakMap<object, Map<string, CustomColumnValue>>();

/**
 * A value the table can order with `<`. Anything that is not a number, a boolean or a string sorts
 * by the text it is rendered as.
 */
function toScalarSortValue(value: unknown): string | number {
  if (value == null) {
    return "";
  }

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "boolean" || typeof value === "string") {
    return String(value);
  }

  return formatJSONValue(value);
}

function toSortValue(value: unknown): CustomColumnValue["sortBy"] {
  // A slice or a wildcard produces an array, which the table compares element by element.
  return Array.isArray(value) ? value.map(toScalarSortValue) : toScalarSortValue(value);
}

export function evaluateCustomColumn(item: object, jsonPath: string): CustomColumnValue {
  let values = valuesByItem.get(item);

  if (!values) {
    values = new Map();
    valuesByItem.set(item, values);
  }

  const cached = values.get(jsonPath);

  if (cached) {
    return cached;
  }

  const value = safeJSONPathValue(item, jsonPath);
  const evaluated: CustomColumnValue = {
    text: formatJSONValue(value),
    sortBy: toSortValue(value),
  };

  values.set(jsonPath, evaluated);

  return evaluated;
}
