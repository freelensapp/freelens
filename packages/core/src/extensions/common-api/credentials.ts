/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { credentialsInjectionToken } from "../../features/credentials/common/credentials-token";
import { getDiForExtensionApi } from "../extension-api-di";

import type { Credentials as CredentialsApi } from "../../features/credentials/common/types";

/** Encrypted credentials, namespaced by the extension's package name (extension.name). */
export const Credentials: CredentialsApi = {
  async get(extensionId, key) {
    return getDiForExtensionApi().inject(credentialsInjectionToken).get(extensionId, key);
  },
  async set(extensionId, key, value) {
    await getDiForExtensionApi().inject(credentialsInjectionToken).set(extensionId, key, value);
  },
  async delete(extensionId, key) {
    await getDiForExtensionApi().inject(credentialsInjectionToken).delete(extensionId, key);
  },
  async list(extensionId) {
    return getDiForExtensionApi().inject(credentialsInjectionToken).list(extensionId);
  },
};
