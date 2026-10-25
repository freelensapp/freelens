/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { createCredentialHandler } from "./credential-handler";
import credentialStoreInjectable from "./credential-store.injectable";

const credentialHandlerInjectable = getInjectable({
  id: "credential-handler",
  instantiate: (di) => createCredentialHandler(di.inject(credentialStoreInjectable)),
});

export default credentialHandlerInjectable;
