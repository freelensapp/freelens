/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { beforeElectronIsReadyInjectionToken } from "@freelensapp/application-for-electron-main";
import { runManyFor } from "@freelensapp/run-many";
import { getInjectable } from "@ogre-tools/injectable";
import { afterWindowIsOpenedInjectionToken } from "../../start-main-application/runnable-tokens/phases";
import electronAppInjectable from "../electron-app.injectable";
import setupPasteHandlerInjectable from "./setup-paste-handler.injectable";

const setupRunnablesAfterWindowIsOpenedInjectable = getInjectable({
  id: "setup-runnables-after-window-is-opened",

  instantiate: (di) => ({
    run: () => {
      const afterWindowIsOpened = runManyFor(di)(afterWindowIsOpenedInjectionToken);
      const app = di.inject(electronAppInjectable);
      const setupPasteHandler = di.inject(setupPasteHandlerInjectable);

      app.on("browser-window-created", (_, win) => {
        afterWindowIsOpened();
        setupPasteHandler(win);
      });

      return undefined;
    },
  }),

  injectionToken: beforeElectronIsReadyInjectionToken,
});

export default setupRunnablesAfterWindowIsOpenedInjectable;
