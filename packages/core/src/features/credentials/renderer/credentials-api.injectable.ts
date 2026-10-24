/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { requestFromChannelInjectionToken } from "@freelensapp/messaging";
import { getInjectable } from "@ogre-tools/injectable";
import { credentialsChannel } from "../common/channel";
import { createCredentialsApi } from "../common/create-credentials-api";
import { credentialsInjectionToken } from "../common/credentials-token";

const credentialsApiInjectable = getInjectable({
  id: "renderer-credentials-api",
  instantiate: (di) => {
    const requestFromChannel = di.inject(requestFromChannelInjectionToken);

    return createCredentialsApi((request) => requestFromChannel(credentialsChannel, request));
  },
  injectionToken: credentialsInjectionToken,
});

export default credentialsApiInjectable;
