/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { observable } from "mobx";

import type { ConfirmDialogParams } from "./confirm-dialog";

const confirmDialogStateInjectable = getInjectable({
  id: "confirm-dialog-state",
  // `deep: false` keeps the params (which include an arbitrary `message`
  // ReactNode) stored by reference. A deep observable would recursively walk
  // the React element tree and, through it, into self-referential objects such
  // as the global object, overflowing the stack.
  instantiate: () => observable.box<ConfirmDialogParams | undefined>(undefined, { deep: false }),
});

export default confirmDialogStateInjectable;
