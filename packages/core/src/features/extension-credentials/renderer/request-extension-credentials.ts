/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { ExtensionCredentialsRequest, ExtensionCredentialsResponse } from "../common/channels";
import type { ExtensionCredentialsBackend } from "../common/extension-credentials";

export type RequestExtensionCredentials = (
  request: ExtensionCredentialsRequest,
) => Promise<ExtensionCredentialsResponse>;

/**
 * The renderer's credentials: every operation is a request to the main
 * process, which holds the store, and a rejection there is a rejection here
 * with the same message.
 */
export const createRendererExtensionCredentials = (
  requestExtensionCredentials: RequestExtensionCredentials,
): ExtensionCredentialsBackend => {
  const request = async (operation: ExtensionCredentialsRequest) => {
    const response = await requestExtensionCredentials(operation);

    if (response.status === "rejected") {
      const error = response.name === "TypeError" ? new TypeError(response.message) : new Error(response.message);

      throw error;
    }

    return response.value;
  };

  return {
    isAvailable: async () => (await request({ operation: "isAvailable" })) === true,
    get: async (extensionId, key) => {
      const value = await request({ operation: "get", extensionId, key });

      return typeof value === "string" ? value : undefined;
    },
    set: async (extensionId, key, value) => {
      await request({ operation: "set", extensionId, key, value });
    },
    delete: async (extensionId, key) => {
      await request({ operation: "delete", extensionId, key });
    },
    keys: async (extensionId) => {
      const keys = await request({ operation: "keys", extensionId });

      return Array.isArray(keys) ? keys : [];
    },
    remove: async (extensionId) => {
      await request({ operation: "remove", extensionId });
    },
  };
};
