import React from "react";
import useOrderableListHook from "./sortable-hook";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { closestCenter, DndContext } from "@dnd-kit/core";
import SortableItem from "./sortable-item";
import styles from "./sortable-list.module.css";

interface OrderableListDependencies {
  children: React.ReactElement[];
  className: string;
  onReorder: (dragIndex: number, releaseIndex: number) => void;
}

const SortableList = ({ children, onReorder, className }: OrderableListDependencies) => {
  const orderableHook = useOrderableListHook({children, onReorder});

  return (
    <div className={`${styles.container} ${className}`} >
      <DndContext
        sensors={orderableHook.sensors}
        collisionDetection={closestCenter}
        onDragEnd={orderableHook.handleDragEnd}
        autoScroll={false}
      >
        <SortableContext items={orderableHook.itemIds} strategy={verticalListSortingStrategy} >
          {orderableHook.items.map((element, index) => (
            <SortableItem key={element.key} item={element} id={element.key?.toString()!}/>
          ))}
        </SortableContext>
      </DndContext>
    </div>
  )
}

export default SortableList;
