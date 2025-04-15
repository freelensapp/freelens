/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { isBoolean } from "@freelensapp/utilities";
import type { IComputedValue } from "mobx";

export interface Showable {
  readonly isShown: IComputedValue<boolean> | boolean;
}

export type MaybeShowable = Showable | object;

export const isShown = (showable: MaybeShowable) => {
  if (!("isShown" in showable)) {
    return true;
  }

  if (showable.isShown === undefined) {
    return true;
  }

  if (isBoolean(showable.isShown)) {
    return showable.isShown;
  }

  return showable.isShown.get();
};
