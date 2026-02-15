/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import manageCustomColumnsDialogStateInjectable from "./manage-custom-columns-dialog-state.injectable";

export type OpenManageCustomColumnsDialog = (tableId: string) => void;

const openManageCustomColumnsDialogInjectable = getInjectable({
  id: "open-manage-custom-columns-dialog",
  instantiate: (di): OpenManageCustomColumnsDialog => {
    const state = di.inject(manageCustomColumnsDialogStateInjectable);

    return (tableId) => state.set({ tableId });
  },
});

export default openManageCustomColumnsDialogInjectable;
