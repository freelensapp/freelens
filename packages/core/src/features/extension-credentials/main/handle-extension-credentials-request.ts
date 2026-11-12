/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { ExtensionCredentialsRequest, ExtensionCredentialsResponse } from "../common/channels";
import type { ExtensionCredentialsBackend } from "../common/extension-credentials";

const perform = async (backend: ExtensionCredentialsBackend, request: ExtensionCredentialsRequest) => {
  switch (request?.operation) {
    case "isAvailable":
      return backend.isAvailable();
    case "get":
      return backend.get(request.extensionId, request.key);
    case "set":
      return backend.set(request.extensionId, request.key, request.value);
    case "delete":
      return backend.delete(request.extensionId, request.key);
    case "keys":
      return backend.keys(request.extensionId);
    case "remove":
      return backend.remove(request.extensionId);
    default:
      throw new TypeError("Unknown operation on extension credentials");
  }
};

/**
 * Performs a request of the renderer on the main process's store, and sends
 * back the outcome as data. The store validates the request: the renderer is
 * not trusted to have done it.
 */
export const handleExtensionCredentialsRequest = async (
  backend: ExtensionCredentialsBackend,
  request: ExtensionCredentialsRequest,
): Promise<ExtensionCredentialsResponse> => {
  try {
    return { status: "fulfilled", value: (await perform(backend, request)) ?? undefined };
  } catch (error) {
    return error instanceof Error
      ? { status: "rejected", name: error.name, message: error.message }
      : { status: "rejected", name: "Error", message: "The operation on extension credentials failed" };
  }
};
