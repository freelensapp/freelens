/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { requestFromChannelInjectionToken } from "@freelensapp/messaging";
import { getInjectable } from "@ogre-tools/injectable";
import { getLatestVersionChannel } from "../../../common/utils/get-latest-version-channel";

const getLatestVersionViaChannelInjectable = getInjectable({
  id: "get-latest-version-via-channel",

  instantiate: (di) => {
    const requestFromChannel = di.inject(requestFromChannelInjectionToken);

    return async (): Promise<string | undefined> => {
      return requestFromChannel(getLatestVersionChannel);
    };
  },
});

export default getLatestVersionViaChannelInjectable;