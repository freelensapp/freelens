/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { observable } from "mobx";

export interface ManageCustomColumnsDialogState {
  tableId: string;
}

const manageCustomColumnsDialogStateInjectable = getInjectable({
  id: "manage-custom-columns-dialog-state",
  instantiate: () => observable.box<ManageCustomColumnsDialogState | undefined>(),
});

export default manageCustomColumnsDialogStateInjectable;
