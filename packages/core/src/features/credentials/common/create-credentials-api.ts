/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { Credentials, RequestCredentials } from "./types";

// Identity is supplied by the extension, not authenticated by this wrapper.
export function createCredentialsApi(request: RequestCredentials): Credentials {
  return {
    async get(extensionId, key) {
      return (await request({ extensionId, scope: extensionId, operation: "get", key })).value;
    },
    async set(extensionId, key, value) {
      await request({ extensionId, scope: extensionId, operation: "set", key, value });
    },
    async delete(extensionId, key) {
      await request({ extensionId, scope: extensionId, operation: "delete", key });
    },
    async list(extensionId) {
      return (await request({ extensionId, scope: extensionId, operation: "list" })).keys ?? [];
    },
  };
}
