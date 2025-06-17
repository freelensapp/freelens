/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getGlobalOverride } from "@freelensapp/test-utils";
import resolveSystemProxyWindowInjectable from "./resolve-system-proxy-window.injectable";

import type { BrowserWindow, Session, WebContents } from "electron";

export default getGlobalOverride(
  resolveSystemProxyWindowInjectable,
  async () =>
    ({
      webContents: {
        session: {
          resolveProxy: () => "DIRECT",
        } as unknown as Session,
      } as unknown as WebContents,
    }) as unknown as BrowserWindow,
);
