/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

/**
 * The fraction of a step a custom column is placed below the column it is anchored to. Every
 * priority the application itself uses is an integer, so this keeps an anchored column between its
 * anchor and whatever follows it.
 */
const anchorStep = 0.001;

export interface AnchoredColumn {
  id: string;
  after?: string;
}

/**
 * Turns the stored `after` anchor of each custom column into the numeric priority the list layout
 * sorts by.
 *
 * A column whose anchor is unknown to this list is appended, which is also what happens when no
 * anchor is stored at all. Columns are resolved in order, so one custom column may be anchored to
 * another.
 */
export function resolveCustomColumnPriorities<T extends AnchoredColumn>(
  columnPriorities: ReadonlyMap<string, number>,
  customColumns: readonly T[],
): (T & { priority: number })[] {
  const priorities = new Map(columnPriorities);
  const minPriority = priorities.size > 0 ? Math.min(...priorities.values()) : 0;
  const anchoredCounts = new Map<string, number>();
  let appendedCount = 0;

  return customColumns.map((column) => {
    const anchorPriority = column.after === undefined ? undefined : priorities.get(column.after);
    let priority: number;

    if (anchorPriority === undefined) {
      appendedCount += 1;
      priority = minPriority - appendedCount;
    } else {
      const placedAfterAnchor = (anchoredCounts.get(column.after as string) ?? 0) + 1;

      anchoredCounts.set(column.after as string, placedAfterAnchor);
      priority = anchorPriority - anchorStep * placedAfterAnchor;
    }

    priorities.set(column.id, priority);

    return { ...column, priority };
  });
}
