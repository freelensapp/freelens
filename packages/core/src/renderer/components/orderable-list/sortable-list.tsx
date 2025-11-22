import React from "react";
import useOrderableListHook from "./sortable-hook";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { closestCenter, DndContext, DragOverlay } from "@dnd-kit/core";
import SortableItem from "./sortable-item";
import styles from "./sortable-list.module.css";

interface OrderableListDependencies {
  children: React.ReactElement[];
  className: string;
  onReorder: (dragIndex: number, releaseIndex: number) => void;
}

const SortableList = ({ children, onReorder, className }: OrderableListDependencies) => {
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
            <SortableItem key={element.key} item={element} id={orderableHook.itemIds[index]} />
          ))}
          <DragOverlay>
            {undefined != orderableHook.activeId && orderableHook.items[orderableHook.activeId]}
          </DragOverlay>
        </SortableContext>
      </DndContext>
    </div>
  );
};

export default SortableList;
