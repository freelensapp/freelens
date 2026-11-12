/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { safeStorage } from "electron";

import type { CredentialsSafeStorage } from "./extension-credentials-store";

const safeStorageInjectable = getInjectable({
  id: "safe-storage",
  instantiate: (): CredentialsSafeStorage => safeStorage,
  causesSideEffects: true,
});

export default safeStorageInjectable;
