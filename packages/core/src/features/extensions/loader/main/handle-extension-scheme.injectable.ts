/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { onLoadOfApplicationInjectionToken } from "@freelensapp/application";
import { getInjectable } from "@ogre-tools/injectable";
import { protocol } from "electron";
import { extensionScheme } from "../common/scheme";
import serveExtensionFileInjectable from "./serve-extension-file.injectable";

/**
 * Serve the extension scheme for the whole session.
 *
 * `protocol.handle` registers against the default session, which the cluster
 * frame shares because its `<webview>`-less iframe sets no `partition`: one
 * registration covers the top page and every cluster frame.
 */
const handleExtensionSchemeInjectable = getInjectable({
  id: "handle-extension-scheme",

  instantiate: (di) => ({
    run: () => {
      const serveExtensionFile = di.inject(serveExtensionFileInjectable);

      protocol.handle(extensionScheme, serveExtensionFile);
    },
  }),

  injectionToken: onLoadOfApplicationInjectionToken,
  causesSideEffects: true,
});

export default handleExtensionSchemeInjectable;
