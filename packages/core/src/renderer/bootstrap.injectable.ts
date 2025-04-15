/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { onLoadOfApplicationInjectionToken } from "@freelensapp/application";
import { getInjectable } from "@ogre-tools/injectable";
import { bootstrap } from "./bootstrap";
import startFrameInjectable from "./start-frame/start-frame.injectable";

const bootstrapInjectable = getInjectable({
  id: "bootstrap",

  instantiate: (di) => ({
    run: async () => {
      await bootstrap(di);
    },

    runAfter: startFrameInjectable,
  }),

  causesSideEffects: true,

  injectionToken: onLoadOfApplicationInjectionToken,
});

export default bootstrapInjectable;
