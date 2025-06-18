/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getGlobalOverride } from "@freelensapp/test-utils";
import ipcRendererInjectable from "./ipc-renderer.injectable";

import type { IpcRenderer } from "electron";

export default getGlobalOverride(
  ipcRendererInjectable,
  () =>
    ({
      invoke: () => {},
      on: () => {},
    }) as unknown as IpcRenderer,
);
