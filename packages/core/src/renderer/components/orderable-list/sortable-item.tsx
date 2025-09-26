import React from "react";
import {useSortable} from "@dnd-kit/sortable";
import {CSS} from "@dnd-kit/utilities";

interface SortableItemDependencies {
  item: React.ReactElement,
  id: string
}

const SortableItem = ({ item, id }: SortableItemDependencies) => {
  // @ts-ignore
  const {attributes, listeners, setNodeRef, transform, transition, isDragging} =
    useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    pointerEvents: isDragging ? "none" : "auto",
    position: "relative",
    zIndex: isDragging ? 99999 : "auto"
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {item}
    </div>
  );
}

export default SortableItem;
