/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import useOrderableListHook from "./orderable-list-hook";

import type { DragEndEvent } from "@dnd-kit/core";

const children = ["first", "second", "third"].map((key) => <div key={key} />);

const dragEnd = (active: string, over?: string) =>
  ({ active: { id: active }, over: over ? { id: over } : null }) as unknown as DragEndEvent;

describe("the hook of an orderable list", () => {
  it("moves the dragged item to the place of the one it is dropped on, and reports both indexes", () => {
    const onReorder = vi.fn();
    const { result } = renderHook(() => useOrderableListHook({ children, onReorder }));

    act(() => result.current.handleDragEnd(dragEnd("third", "first")));

    expect(onReorder).toHaveBeenCalledWith(2, 0);
    expect(result.current.items.map((element) => element.key)).toEqual(["third", "first", "second"]);
  });

  it("changes nothing when the item is dropped outside the list", () => {
    const onReorder = vi.fn();
    const { result } = renderHook(() => useOrderableListHook({ children, onReorder }));

    act(() => result.current.handleDragEnd(dragEnd("first")));

    expect(onReorder).not.toHaveBeenCalled();
    expect(result.current.items.map((element) => element.key)).toEqual(["first", "second", "third"]);
  });
});
