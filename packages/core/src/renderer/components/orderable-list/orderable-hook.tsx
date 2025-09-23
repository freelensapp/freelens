import React, { useEffect, useState } from "react";
import styles from "./orderable-list.module.css";

interface OrderableListHookDependencies {
  children: React.ReactElement[];
  onReorder: (dragIndex: number, releaseIndex: number) => void;
}

const useOrderableListHook = ({ children, onReorder }: OrderableListHookDependencies) => {
  const [items, setItems] = useState(children);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  useEffect(() => {
    setItems(children);
  }, [children]);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    setDragIndex(index);
    // e.dataTransfer.effectAllowed = "move";
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    setOverIndex(index);
    getClassName(index);
  }

  const handleDrop = (index: number) => {
    if (null == dragIndex) return;
    const newItems = [...items];
    const draggedItem = newItems[dragIndex];
    newItems.splice(dragIndex, 1);
    newItems.splice(index, 0, draggedItem);
    setItems(newItems);
    setDragIndex(null);
    setOverIndex(null);
    onReorder(dragIndex, index);
  }

  const handleDragEnd = () => {
    setOverIndex(null);
    setDragIndex(null);
  };

  const getClassName = (index: number) => {
    if (null == dragIndex) return "";
    if (index === dragIndex) return "";
    if (index === overIndex) {
      return dragIndex > index ? styles.overGreater : styles.overLower;
    }
    return "";
  }

  return {
    items,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
    getClassName
  }

}

export default useOrderableListHook;
