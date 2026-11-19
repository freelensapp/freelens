/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./orderable-list.scss";

import { closestCenter, DndContext, DragOverlay } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { cssNames } from "@freelensapp/utilities";
import { OrderableItem } from "./orderable-item";
import useOrderableListHook from "./orderable-list-hook";

import type { ReactElement } from "react";

export interface OrderableListProps {
  /**
   * The items of the list, in their order. Each one needs a key unique in the list, by which the
   * list tells them apart while they are dragged.
   */
  children: ReactElement[];
  className?: string;
  /**
   * Called when an item is dropped on the place of another one, with the index of the item that
   * was dragged and the index it was dropped at. The list shows the new order at once; it shows
   * the order of its children again when they change.
   */
  onReorder: (dragIndex: number, releaseIndex: number) => void;
}

/**
 * A vertical list whose items the user reorders by dragging them with the pointer.
 */
export const OrderableList = ({ children, onReorder, className }: OrderableListProps) => {
  const orderableHook = useOrderableListHook({ children, onReorder });

  return (
    <div className={cssNames("OrderableList", className)}>
      <DndContext
        sensors={orderableHook.sensors}
        collisionDetection={closestCenter}
        onDragStart={orderableHook.onDragStart}
        onDragEnd={orderableHook.handleDragEnd}
      >
        <SortableContext items={orderableHook.itemIds} strategy={verticalListSortingStrategy}>
          {orderableHook.items.map((element, index) => (
            <OrderableItem key={element.key} item={element} id={orderableHook.itemIds[index]} />
          ))}
          <DragOverlay>
            {undefined != orderableHook.activeId && orderableHook.items[orderableHook.activeId]}
          </DragOverlay>
        </SortableContext>
      </DndContext>
    </div>
  );
};
