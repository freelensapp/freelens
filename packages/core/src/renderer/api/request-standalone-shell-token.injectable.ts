/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { ipcRenderer } from "electron";

import type { RequestShellToken } from "./terminal-api";

/**
 * Mints the one time token for a shell that belongs to no cluster, and so can
 * be asked for from the root frame.
 */
const requestStandaloneShellTokenInjectable = getInjectable({
  id: "request-standalone-shell-token",

  instantiate: (): RequestShellToken => (tabId) => ipcRenderer.invoke("app:standalone-shell-api", tabId),
});

export default requestStandaloneShellTokenInjectable;
