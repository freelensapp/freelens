/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./react-table.scss";
import { Icon } from "@freelensapp/icon";
import { cssNames } from "@freelensapp/utilities";
import React, { useCallback, useMemo } from "react";
import type { Row, UseTableOptions } from "react-table";
import { useFlexLayout, useSortBy, useTable } from "react-table";

export interface ReactTableProps<Data extends object> extends UseTableOptions<Data> {
  headless?: boolean;
}

export function ReactTable<Data extends object>({ columns, data, headless }: ReactTableProps<Data>) {
  const defaultColumn = useMemo(
    () => ({
      minWidth: 20,
      width: 100,
    }),
    [],
  );

  const { getTableProps, getTableBodyProps, headerGroups, rows, prepareRow } = useTable(
    {
      columns,
      data,
      defaultColumn,
    },
    useFlexLayout,
    useSortBy,
  );

  const renderRow = useCallback(
    (row: Row<Data>) => {
      prepareRow(row);

      return (
        <div className="tr" key={row.id}>
          {row.cells.map((cell, index) => (
            <div
              {...cell.getCellProps()}
              key={cell.getCellProps().key}
              className={cssNames("td", columns[index].accessor)}
            >
              {cell.render("Cell")}
            </div>
          ))}
        </div>
      );
    },
    [columns, prepareRow],
  );

  return (
    <div {...getTableProps()} className="table">
      {!headless && (
        <div className="thead">
          {headerGroups.map((headerGroup) => (
            <div {...headerGroup.getHeaderGroupProps()} key={headerGroup.getHeaderGroupProps().key} className="tr">
              {headerGroup.headers.map((column) => (
                <div
                  {...column.getHeaderProps(column.getSortByToggleProps())}
                  key={column.getHeaderProps().key}
                  className="th"
                >
                  {column.render("Header")}
                  {/* Sort direction indicator */}
                  <span>
                    {column.isSorted ? (
                      column.isSortedDesc ? (
                        <Icon material="arrow_drop_down" small />
                      ) : (
                        <Icon material="arrow_drop_up" small />
                      )
                    ) : (
                      !column.disableSortBy && <Icon material="arrow_drop_down" small className="disabledArrow" />
                    )}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      <div {...getTableBodyProps()}>{rows.map(renderRow)}</div>
    </div>
  );
}
