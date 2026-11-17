/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import { persistStateToConfigInjectionToken } from "../common/save-to-file";

const persistStateToConfigInjectable = getInjectable({
  id: "persist-state-to-config",
  instantiate: (di) => {
    const logger = di.inject(loggerInjectionToken);

    // One `set` for the whole state: conf reads and writes the whole file on
    // every `set`, so a `set` per key would leave the file half updated
    // between them. A state without keys has nothing to write.
    return (config, state) => {
      if (Object.keys(state).length === 0) {
        return;
      }

      logger.info(`[BASE-STORE]: saving ${config.path}...`);
      config.set(state);
    };
  },
  injectionToken: persistStateToConfigInjectionToken,
});

export default persistStateToConfigInjectable;
