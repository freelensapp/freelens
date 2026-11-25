/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { beforeElectronIsReadyInjectionToken } from "@freelensapp/application-for-electron-main";
import { getInjectable } from "@ogre-tools/injectable";
import { protocol } from "electron";
import { extensionScheme } from "../common/scheme";

/**
 * Declare what the extension scheme is allowed to do, which Electron only
 * accepts before the app is ready.
 *
 * Measured on Electron 42.7.1 (macOS), narrowing the privileges one at a time
 * against a page on one custom scheme importing a module from another:
 *
 * - `corsEnabled` is the load-bearing one. Without it the import fails, with it
 *   alone it succeeds, and no `Access-Control-Allow-Origin` response header is
 *   needed -- so the handler deliberately sends none.
 * - `standard` is not required even for relative specifiers, but it is kept for
 *   ordinary hierarchical-URL semantics.
 * - `secure` is kept because the host page is served over `https:`.
 * - `supportFetchAPI` turned out to be irrelevant to module loading, and is
 *   kept only so an extension can `fetch()` its own non-code resources.
 *
 * The cluster frame is a different origin
 * (`https://<clusterId>.renderer.freelens.app`) and extension cluster pages
 * render there, but it sets no `partition`: it shares the window session, so
 * this registration and the one `protocol.handle` cover both frames.
 */
const registerExtensionSchemeAsPrivilegedInjectable = getInjectable({
  id: "register-extension-scheme-as-privileged",

  instantiate: () => ({
    run: () => {
      protocol.registerSchemesAsPrivileged([
        {
          scheme: extensionScheme,
          privileges: {
            standard: true,
            secure: true,
            corsEnabled: true,
            supportFetchAPI: true,
          },
        },
      ]);

      return undefined;
    },
  }),

  injectionToken: beforeElectronIsReadyInjectionToken,
  causesSideEffects: true,
});

export default registerExtensionSchemeAsPrivilegedInjectable;
