/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// Myers' shortest edit path counts inserted and deleted lines without an N-by-M table.
// A replacement counts as one deletion and one insertion. Line endings are significant.
export function countChangedLines(baseline: string, draft: string): number {
  if (baseline === draft) return 0;

  const before = baseline.match(/[^\n]*\n|[^\n]+$/g) ?? [];
  const after = draft.match(/[^\n]*\n|[^\n]+$/g) ?? [];
  let start = 0;
  let endBefore = before.length;
  let endAfter = after.length;

  while (start < endBefore && start < endAfter && before[start] === after[start]) start++;
  while (endBefore > start && endAfter > start && before[endBefore - 1] === after[endAfter - 1]) {
    endBefore--;
    endAfter--;
  }

  const n = endBefore - start;
  const m = endAfter - start;

  if (!n || !m) return n + m;

  const frontier = new Map<number, number>([[1, 0]]);

  for (let distance = 0; distance <= n + m; distance++) {
    for (let diagonal = -distance; diagonal <= distance; diagonal += 2) {
      const left = frontier.get(diagonal - 1) ?? -Infinity;
      const right = frontier.get(diagonal + 1) ?? -Infinity;
      let x = diagonal === -distance || (diagonal !== distance && left < right) ? right : left + 1;
      let y = x - diagonal;

      while (x < n && y < m && before[start + x] === after[start + y]) {
        x++;
        y++;
      }

      if (x >= n && y >= m) return distance;
      frontier.set(diagonal, x);
    }
  }

  return n + m;
}
