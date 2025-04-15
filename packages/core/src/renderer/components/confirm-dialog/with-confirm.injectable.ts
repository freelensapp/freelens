/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import type { ConfirmDialogParams } from "./confirm-dialog";
import openConfirmDialogInjectable from "./open.injectable";

export type WithConfirmation = (params: ConfirmDialogParams) => () => void;

const withConfirmationInjectable = getInjectable({
  id: "with-confirmation",
  instantiate: (di): WithConfirmation => {
    const open = di.inject(openConfirmDialogInjectable);

    return (params) => () => open(params);
  },
});

export default withConfirmationInjectable;
