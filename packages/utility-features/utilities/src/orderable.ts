/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { IComputedValue } from "mobx";

/**
 * The Orderable interface is used to define an object that has an order number.
 */
export interface Orderable {
  readonly orderNumber: number;
}

export interface MaybeOrderable {
  readonly orderNumber?: number | IComputedValue<number>;
}

export const byOrderNumber = <T extends MaybeOrderable>(left: T, right: T) => {
  const leftValue =
    typeof left.orderNumber === "number"
      ? left.orderNumber
      : left.orderNumber?.get();

  const rightValue =
    typeof right.orderNumber === "number"
      ? right.orderNumber
      : right.orderNumber?.get();

  return (leftValue ?? Number.MAX_SAFE_INTEGER) - (rightValue ?? Number.MAX_SAFE_INTEGER);
}
