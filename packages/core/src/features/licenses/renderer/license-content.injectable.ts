/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { requestFromChannelInjectionToken } from "@freelensapp/messaging";
import { getInjectable } from "@ogre-tools/injectable";
import { asyncComputed } from "../../../common/utils/async-computed";
import { licenseContentChannel } from "../common/license-content-channel";

const licenseContentInjectable = getInjectable({
  id: "license-content",

  instantiate: (di) => {
    const requestFromChannel = di.inject(requestFromChannelInjectionToken);

    return asyncComputed({
      getValueFromObservedPromise: async () => {
        try {
          // The license file is read in the main process (see
          // features/licenses/main/license-content-request-channel-listener):
          // reading it from the renderer is unreliable for packaged builds
          // where it lives inside app.asar (issue #2240).
          return await requestFromChannel(licenseContentChannel);
        } catch (error) {
          return `Error loading license file: ${error}`;
        }
      },
      valueWhenPending: "Loading...",
    });
  },
});

export default licenseContentInjectable;
