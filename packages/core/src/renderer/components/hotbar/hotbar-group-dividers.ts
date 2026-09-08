/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

export interface HotbarGroupableItem {
  group?: string;
}

/**
 * Given the hotbar's cells in display order (one entry per cell, `undefined`
 * `group` for empty cells or entities with no group tag), returns a divider
 * label per cell: the group name when it starts a new run of same-tagged
 * cells, `null` otherwise. Cells are never reordered — this only reflects
 * the manual order already chosen by the user via drag-and-drop.
 */
export function computeGroupDividers(items: readonly (HotbarGroupableItem | undefined)[]): (string | null)[] {
  let lastGroup: string | undefined;

  return items.map((item) => {
    const group = item?.group;
    const divider = group && group !== lastGroup ? group : null;

    lastGroup = group;

    return divider;
  });
}
