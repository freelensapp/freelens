/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { requestFromChannelInjectionToken } from "@freelensapp/messaging";
import { getInjectable } from "@ogre-tools/injectable";
import { extensionCredentialsChannel } from "../common/channels";
import { extensionCredentialsBackendInjectionToken } from "../common/extension-credentials-backend-injection-token";
import { createRendererExtensionCredentials } from "./request-extension-credentials";

const rendererExtensionCredentialsInjectable = getInjectable({
  id: "renderer-extension-credentials",
  instantiate: (di) => {
    const requestFromChannel = di.inject(requestFromChannelInjectionToken);

    return createRendererExtensionCredentials((request) => requestFromChannel(extensionCredentialsChannel, request));
  },
  injectionToken: extensionCredentialsBackendInjectionToken,
});

export default rendererExtensionCredentialsInjectable;
