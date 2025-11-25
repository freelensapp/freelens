import { DragEndEvent, DragStartEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { random } from "lodash";
import React, { ReactElement, useEffect, useMemo, useState } from "react";

interface OrderableListHookDependencies {
  children: React.ReactElement[];
  onReorder: (dragIndex: number, releaseIndex: number) => void;
}

const useOrderableListHook = ({ children, onReorder }: OrderableListHookDependencies) => {
  const stableChildren = useMemo(() => children, [children.map(c => c.key).join(",")]);
  const [items, setItems] = useState<ReactElement[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const itemIds: string[] = items.map((child) => child.key?.toString() ?? random().toString());

  useEffect(() => {
    setItems(children);
  }, [stableChildren]);

  const onDragStart = (event: DragStartEvent) => {
    const activeIndex = items.findIndex((item) => item.key === event.active.id);
    setActiveId(activeIndex);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    const dragIndex = items.findIndex((item) => item.key === (active.id as string));
    const dropIndex = items.findIndex((item) => item.key === (over?.id as string));

    const newItems = [...items];
    const [draggedItem] = newItems.splice(dragIndex, 1);
    newItems.splice(dropIndex, 0, draggedItem);
    setItems(newItems);
    onReorder(dragIndex, dropIndex);
  };

  return {
    items,
    itemIds,
    sensors,
    activeId,
    onDragStart,
    handleDragEnd,
  };
};

export default useOrderableListHook;
