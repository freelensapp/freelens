import React from "react";
import useOrderableListHook from "./orderable-hook";
import { observer } from "mobx-react";

interface OrderableListDependencies {
  children: React.ReactElement[];
  className: string;
  onReorder: (dragIndex: number, releaseIndex: number) => void;
}

const OrderableList = observer(({ children, className, onReorder }: OrderableListDependencies) => {
  const orderableHook = useOrderableListHook({ children, onReorder});

  return (
    <div className={className}>
      {orderableHook.items.map((item, index) => (
        <div
          key={index}
          draggable
          onDragStart={(e) => orderableHook.handleDragStart(e, index)}
          onDragOver={(e) => orderableHook.handleDragOver(e, index)}
          onDrop={() => orderableHook.handleDrop(index)}
          onDragEnd={orderableHook.handleDragEnd}
          className={orderableHook.getClassName(index)}
        >
          {item}
        </div>
      ))}
    </div>
  )
})

export default OrderableList;
