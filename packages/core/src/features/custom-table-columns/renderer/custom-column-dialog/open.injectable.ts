/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { action } from "mobx";
import customColumnDialogStateInjectable from "./state.injectable";

import type { CustomColumnDialogParams } from "./state.injectable";

export type OpenCustomColumnDialog = (params: CustomColumnDialogParams) => void;

const openCustomColumnDialogInjectable = getInjectable({
  id: "open-custom-column-dialog",
  instantiate: (di): OpenCustomColumnDialog => {
    const state = di.inject(customColumnDialogStateInjectable);

    return action((params) => {
      state.set(params);
    });
  },
});

export default openCustomColumnDialogInjectable;
