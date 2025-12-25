import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import React from "react";

interface OrderableItemDependencies {
  item: React.ReactElement;
  id: string;
}

const OrderableItem = ({ item, id }: OrderableItemDependencies) => {
  // @ts-ignore
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    pointerEvents: isDragging ? "none" : "auto",
    opacity: isDragging ? 0 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {item}
    </div>
  );
};

export default OrderableItem;
