/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// Replicates the Jest moduleNameMapper `"^electron$": "identity-obj-proxy"`
// from the removed @freelensapp/jest shared config: every named import from
// "electron" resolves to its own name as a string. Unit tests never talk to a
// real Electron; they only need stable, non-undefined placeholders they can
// compare against (e.g. `expect(di.inject(ipcRendererInjectable)).toBe(ipcRenderer)`).
//
// ESM named exports cannot be generated dynamically from a Proxy, so the
// electron values imported anywhere in the workspace are enumerated here.
// TypeScript still type-checks against the real electron types; this module is
// only substituted at runtime through the `resolve.alias` entry in
// vitest.config.ts.

export const app: any = "app";
export const BrowserWindow: any = "BrowserWindow";
export const clipboard: any = "clipboard";
export const dialog: any = "dialog";
export const ipcMain: any = "ipcMain";
export const ipcRenderer: any = "ipcRenderer";
export const Menu: any = "Menu";
export const nativeTheme: any = "nativeTheme";
export const powerMonitor: any = "powerMonitor";
export const session: any = "session";
export const shell: any = "shell";
export const Tray: any = "Tray";
export const webContents: any = "webContents";
export const webFrame: any = "webFrame";

export default new Proxy(
  {},
  {
    get: (_target, key) => (key === "__esModule" ? false : key),
  },
);
