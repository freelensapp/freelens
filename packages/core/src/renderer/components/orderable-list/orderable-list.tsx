import { closestCenter, DndContext, DragOverlay } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import React from "react";
import OrderableItem from "./orderable-item";
import styles from "./orderable-list.module.css";
import useOrderableListHook from "./orderable-list-hook";

interface OrderableListDependencies {
  children: React.ReactElement[];
  className: string;
  onReorder: (dragIndex: number, releaseIndex: number) => void;
}

const OrderableList = ({ children, onReorder, className }: OrderableListDependencies) => {
  const orderableHook = useOrderableListHook({ children, onReorder });

  return (
    <div className={`${styles.container} ${className}`}>
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

export default OrderableList;
