/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { dialog } from "electron";

import type { OpenDialogOptions } from "electron";

export type ShowOpenDialog = (options: OpenDialogOptions) => Promise<Electron.OpenDialogReturnValue>;

const showOpenDialogInjectable = getInjectable({
  id: "show-open-dialog",
  instantiate: (): ShowOpenDialog => (opts) => dialog.showOpenDialog(opts),
  causesSideEffects: true,
});

export default showOpenDialogInjectable;
