/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Icon } from "@freelensapp/icon";
import { cssNames } from "@freelensapp/utilities";
import { observer } from "mobx-react";
import { useState } from "react";
import styles from "./sortable-table.module.scss";

import type { StrictReactNode } from "@freelensapp/utilities";

import type { ReactElement } from "react";

export interface SortableTableColumn<Item> {
  /**
   * Stable identifier of the column, used as the React key and as the sort key.
   */
  id: string;
  title: StrictReactNode;
  /**
   * Applied to the column's `<col>`, so every cell in the column shares it.
   * Columns without a width share whatever is left over.
   */
  width?: string;
  /**
   * The value the column sorts on. Omit to make the column unsortable.
   */
  sortBy?: (item: Item) => string | number;
  renderCell: (item: Item) => StrictReactNode;
}

export interface SortableTableProps<Item> {
  columns: SortableTableColumn<Item>[];
  items: Item[];
  getItemKey: (item: Item) => string;
  className?: string;
}

type SortOrder = "asc" | "desc";

interface SortState {
  columnId: string;
  order: SortOrder;
}

const compare = (left: string | number, right: string | number): number => {
  if (typeof left === "string" && typeof right === "string") {
    return left.localeCompare(right);
  }

  if (left < right) return -1;
  if (left > right) return 1;

  return 0;
};

function NonObservedSortableTable<Item>({ columns, items, getItemKey, className }: SortableTableProps<Item>) {
  const [sort, setSort] = useState<SortState | undefined>(undefined);

  const sortBy = sort && columns.find((column) => column.id === sort.columnId)?.sortBy;
  const direction = sort?.order === "desc" ? -1 : 1;
  // `sort` is stable, so equal rows keep the order they were given in.
  const rows = sortBy ? [...items].sort((left, right) => direction * compare(sortBy(left), sortBy(right))) : items;

  const toggleSort = (columnId: string) => {
    setSort((current) => ({
      columnId,
      order: current?.columnId === columnId && current.order === "asc" ? "desc" : "asc",
    }));
  };

  return (
    <table className={cssNames(styles.table, className)}>
      <colgroup>
        {columns.map((column) => (
          <col key={column.id} style={column.width ? { width: column.width } : undefined} />
        ))}
      </colgroup>
      <thead>
        <tr>
          {columns.map((column) => {
            const isSorted = sort?.columnId === column.id;

            return (
              <th
                key={column.id}
                className={styles.th}
                aria-sort={isSorted ? (sort.order === "asc" ? "ascending" : "descending") : undefined}
              >
                {column.sortBy ? (
                  <button type="button" className={styles.sortButton} onClick={() => toggleSort(column.id)}>
                    {column.title}
                    <Icon
                      small
                      material={isSorted && sort.order === "asc" ? "arrow_drop_up" : "arrow_drop_down"}
                      className={cssNames({ [styles.inactiveSortIcon]: !isSorted })}
                    />
                  </button>
                ) : (
                  column.title
                )}
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {rows.map((item) => (
          <tr key={getItemKey(item)}>
            {columns.map((column) => (
              <td key={column.id} className={styles.td}>
                {column.renderCell(item)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * A small client-sorted table for a fixed, fully materialized set of rows.
 *
 * Replaces the `react-table` 7 wrapper this file supersedes. That package was
 * last released in 2022-05 and declares no React 19 peer; what it was used for
 * here was `useTable` + `useSortBy` + `useFlexLayout`, and the flex layout was
 * already redundant with the stylesheet. See #2360.
 *
 * It is an observer because `renderCell` runs during *this* component's render,
 * not the caller's, so observables a cell reads are only tracked here.
 *
 * For lists of Kubernetes objects use `Table` from this directory instead -- it
 * virtualizes, persists the sort order in the URL, and is what every resource
 * view uses.
 */
export const SortableTable = observer(NonObservedSortableTable) as <Item>(
  props: SortableTableProps<Item>,
) => ReactElement;
