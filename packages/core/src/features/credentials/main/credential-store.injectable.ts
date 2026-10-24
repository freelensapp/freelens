/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { safeStorage } from "electron";
import directoryForUserDataInjectable from "../../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import { CredentialStore } from "./credential-store";

const credentialStoreInjectable = getInjectable({
  id: "credential-store",
  instantiate: (di) => new CredentialStore(di.inject(directoryForUserDataInjectable), safeStorage),
  causesSideEffects: true,
});

export default credentialStoreInjectable;
