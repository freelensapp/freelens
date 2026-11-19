/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import type { CSSProperties, ReactElement } from "react";

export interface OrderableItemProps {
  /**
   * The element the item shows, which the pointer drags.
   */
  item: ReactElement;
  /**
   * The id of the item among the others of its `OrderableList`, which is the key of its element.
   */
  id: string;
}

/**
 * An item of an `OrderableList`, which wraps each of its children in one. Outside an
 * `OrderableList` it shows its element and cannot be dragged.
 */
export const OrderableItem = ({ item, id }: OrderableItemProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    pointerEvents: isDragging ? "none" : "auto",
    opacity: isDragging ? 0 : 1,
  };

  return (
    <div ref={setNodeRef} className="OrderableItem" style={style} {...attributes} {...listeners}>
      {item}
    </div>
  );
};
