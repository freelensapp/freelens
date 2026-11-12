/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectionToken } from "@ogre-tools/injectable";

import type { ExtensionCredentialsBackend } from "./extension-credentials";

export const extensionCredentialsBackendInjectionToken = getInjectionToken<ExtensionCredentialsBackend>({
  id: "extension-credentials-backend",
});
