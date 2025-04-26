/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getGlobalOverride } from "@freelensapp/test-utils";
import type { IpcMain } from "electron";
import ipcMainInjectable from "./ipc-main.injectable";

export default getGlobalOverride(
  ipcMainInjectable,
  () =>
    ({
      handle: () => {},
      on: () => {},
      off: () => {},
    }) as unknown as IpcMain,
);
