/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// Wrapper for "react-window" v2 component
// API docs: https://react-window.vercel.app
import "./virtual-list.scss";

import { cssNames } from "@freelensapp/utilities";
import { isEqual } from "es-toolkit";
import { observer } from "mobx-react";
import React, { useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { List } from "react-window";

import type { ForwardedRef, UIEventHandler } from "react";
import type { Align, ListImperativeAPI, RowComponentProps } from "react-window";

import type { TableRowProps } from "../table/table-row";

export interface VirtualListProps<T extends { getId(): string } | string> {
  items: T[];
  rowHeights: number[];
  className?: string;
  width?: number | string;
  initialOffset?: number;
  readyOffset?: number;
  selectedItemId?: string;
  getRow?: (uid: T extends string ? number : string) => React.ReactElement | undefined | null;
  onScroll?: UIEventHandler<HTMLDivElement>;
  outerRef?: React.Ref<HTMLDivElement>;

  /**
   * If specified then the list will render with a fixed pixel height instead of
   * measuring and filling its parent container.
   */
  fixedHeight?: number;
}

export interface VirtualListRef {
  scrollToItem: (index: number, align: Align) => void;
  resetAfterIndex: (index: number) => void;
}

function setRef<T>(ref: React.Ref<T> | undefined, value: T | null) {
  if (typeof ref === "function") {
    ref(value);
  } else if (ref && typeof ref === "object") {
    (ref as React.MutableRefObject<T | null>).current = value;
  }
}

// In unit tests jsdom has no layout and ResizeObserver is stubbed as a no-op, so
// react-window v2 would measure the list container as 0 and render no rows. Seed
// a large initial height under test so lists render their rows (this restores
// what the react-virtualized-auto-sizer mock used to provide). In the running
// app ResizeObserver reports the real size, so this initial value only affects
// the very first frame — keep it 0 there to avoid rendering off-screen rows.
const initialListHeight = process.env.NODE_ENV === "test" ? 420_000 : 0;

function VirtualListInner<T extends { getId(): string } | string>({
  items,
  rowHeights,
  className,
  width = "100%",
  initialOffset = 1,
  readyOffset = 10,
  selectedItemId,
  getRow,
  onScroll,
  outerRef,
  fixedHeight,
  forwardedRef,
}: VirtualListProps<T> & { forwardedRef?: ForwardedRef<VirtualListRef> }) {
  const [overscanCount, setOverscanCount] = useState(initialOffset);
  const [resetVersion, setResetVersion] = useState(0);
  const [listApi, setListApi] = useState<ListImperativeAPI | null>(null);

  // Keep the row-height accessor referentially stable while the heights are
  // unchanged, so react-window v2's internal bounds cache (memoized on the
  // rowHeight reference) is only rebuilt when sizes actually change. Bumping
  // resetVersion forces a rebuild on demand — the v2 equivalent of
  // VariableSizeList.resetAfterIndex, which v2 no longer exposes.
  const heightsRef = useRef(rowHeights);

  if (heightsRef.current !== rowHeights && !isEqual(heightsRef.current, rowHeights)) {
    heightsRef.current = rowHeights;
  }

  const heights = heightsRef.current;
  // resetVersion is an intentional extra dependency: bumping it recreates the
  // accessor so react-window v2 rebuilds its bounds cache on demand.
  const rowHeight = useCallback((index: number) => heights[index], [heights, resetVersion]);

  useImperativeHandle(
    forwardedRef,
    () => ({
      scrollToItem: (index, align) => listApi?.scrollToRow({ index, align }),
      resetAfterIndex: () => setResetVersion((version) => version + 1),
    }),
    [listApi],
  );

  // react-window v2 has no `outerRef` prop; expose the scroll-container element
  // (the List's outermost node) to consumers through the imperative handle.
  useEffect(() => {
    setRef(outerRef, listApi?.element ?? null);

    return () => setRef(outerRef, null);
  }, [listApi, outerRef]);

  useEffect(() => {
    if (selectedItemId) {
      const index = items.findIndex((item) => selectedItemId === (typeof item === "string" ? item : item.getId()));

      if (index >= 0) {
        listApi?.scrollToRow({ index, align: "smart" });
      }
    }

    setOverscanCount(readyOffset);
  });

  // react-window v2's List fills the height defined by its `style` and tracks
  // its own size via ResizeObserver. Give it a fixed pixel height when the
  // consumer provides one; otherwise fill the parent (which has a definite flex
  // height) with `height: 100%`. This replaces react-virtualized-auto-sizer,
  // which measured the flex parent as 0 under v2 and left every list empty.
  return (
    <div className={cssNames("VirtualList", className)}>
      <List<RowData<T>>
        className="list"
        rowComponent={Row as never}
        rowCount={items.length}
        rowHeight={rowHeight}
        rowProps={{ items, getRow }}
        overscanCount={overscanCount}
        defaultHeight={initialListHeight}
        listRef={setListApi}
        onScroll={onScroll}
        style={{ width, height: typeof fixedHeight === "number" ? fixedHeight : "100%" }}
      />
    </div>
  );
}

const VirtualListWithRef = <T extends { getId(): string } | string>({
  ref,
  ...props
}: VirtualListProps<T> & { ref?: ForwardedRef<VirtualListRef> }) => (
  <VirtualListInner<T> {...props} forwardedRef={ref} />
);

export const VirtualList = VirtualListWithRef as <T extends { getId(): string } | string>(
  props: VirtualListProps<T> & { ref?: ForwardedRef<VirtualListRef> },
) => React.JSX.Element;

interface RowData<T extends { getId(): string } | string> {
  items: T[];
  getRow?: (uid: T extends string ? number : string) => React.ReactElement | undefined | null;
}

const Row = observer(
  <T extends { getId(): string } | string>({ index, style, items, getRow }: RowComponentProps<RowData<T>>) => {
    const item = items[index];
    const row = getRow?.((typeof item == "string" ? index : item.getId()) as never);

    if (!row) return null;

    const typedRow = row as React.ReactElement<TableRowProps<T>>;

    return React.cloneElement(typedRow, {
      style: Object.assign({}, typedRow.props.style, style),
    });
  },
);
