/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { createCredentialsApi } from "../common/create-credentials-api";
import { credentialsInjectionToken } from "../common/credentials-token";
import credentialHandlerInjectable from "./credential-handler.injectable";

const credentialsApiInjectable = getInjectable({
  id: "main-credentials-api",
  instantiate: (di) => createCredentialsApi(di.inject(credentialHandlerInjectable)),
  injectionToken: credentialsInjectionToken,
});

export default credentialsApiInjectable;
