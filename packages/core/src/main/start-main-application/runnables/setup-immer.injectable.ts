/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { beforeElectronIsReadyInjectionToken } from "@freelensapp/application-for-electron-main";
import { getInjectable } from "@ogre-tools/injectable";
import { enableMapSet, setAutoFreeze } from "immer";

const setupImmerInjectable = getInjectable({
  id: "setup-immer",

  instantiate: () => ({
    run: () => {
      // Docs: https://immerjs.github.io/immer/
      // Required in `utils/storage-helper.ts`
      setAutoFreeze(false); // allow to merge mobx observables
      enableMapSet(); // allow to merge maps and sets

      return undefined;
    },
  }),

  injectionToken: beforeElectronIsReadyInjectionToken,
});

export default setupImmerInjectable;
