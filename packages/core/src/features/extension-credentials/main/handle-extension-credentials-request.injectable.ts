/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getRequestChannelListenerInjectable } from "@freelensapp/messaging";
import { extensionCredentialsChannel } from "../common/channels";
import { extensionCredentialsBackendInjectionToken } from "../common/extension-credentials-backend-injection-token";
import { handleExtensionCredentialsRequest } from "./handle-extension-credentials-request";

const handleExtensionCredentialsRequestInjectable = getRequestChannelListenerInjectable({
  id: "handle-extension-credentials-request",
  channel: extensionCredentialsChannel,
  getHandler: (di) => {
    const backend = di.inject(extensionCredentialsBackendInjectionToken);

    return (request) => handleExtensionCredentialsRequest(backend, request);
  },
});

export default handleExtensionCredentialsRequestInjectable;
