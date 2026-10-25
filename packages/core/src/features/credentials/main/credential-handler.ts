/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { assertCredentialScope } from "../common/types";

import type { RequestCredentials } from "../common/types";
import type { CredentialStore } from "./credential-store";

export function createCredentialHandler(
  store: Pick<CredentialStore, "get" | "set" | "delete" | "list">,
): RequestCredentials {
  return async (request) => {
    // The request-channel transport does not pass the sender event to the handler.
    // Both fields are caller claims: this check prevents mistakes, not malicious extensions.
    if (!request || request.scope === "core" || request.scope !== request.extensionId) {
      throw new Error("Credential scope must match the extension package name; core is reserved.");
    }

    assertCredentialScope(request.extensionId);

    switch (request.operation) {
      case "get":
        return { value: await store.get(request.scope, request.key) };
      case "set":
        await store.set(request.scope, request.key, request.value);
        return {};
      case "delete":
        await store.delete(request.scope, request.key);
        return {};
      case "list":
        return { keys: await store.list(request.scope) };
      default:
        throw new Error("Invalid credential operation.");
    }
  };
}
