/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import { ExtensionInstallationStateStore } from "./extension-installation-state-store";

const extensionInstallationStateStoreInjectable = getInjectable({
  id: "extension-installation-state-store",
  instantiate: (di) =>
    new ExtensionInstallationStateStore({
      logger: di.inject(loggerInjectionToken),
    }),
});

export default extensionInstallationStateStoreInjectable;
