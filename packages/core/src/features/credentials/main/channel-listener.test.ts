/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { createContainer } from "@ogre-tools/injectable";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { credentialsChannel } from "../common/channel";
import { credentialsInjectionToken } from "../common/credentials-token";
import credentialChannelListenerInjectable from "./channel-listener.injectable";
import credentialHandlerInjectable from "./credential-handler.injectable";
import credentialStoreInjectable from "./credential-store.injectable";
import credentialsApiInjectable from "./credentials-api.injectable";

import type { CredentialRequest, RequestCredentials } from "../common/types";
import type { CredentialStore } from "./credential-store";

describe("credential channel listener and main API", () => {
  const store = {
    get: vi.fn<CredentialStore["get"]>(),
    set: vi.fn<CredentialStore["set"]>(),
    delete: vi.fn<CredentialStore["delete"]>(),
    list: vi.fn<CredentialStore["list"]>(),
  };
  let handler: RequestCredentials;
  let di: ReturnType<typeof createContainer>;

  beforeEach(() => {
    vi.resetAllMocks();
    di = createContainer("credentials-test");
    di.register(
      credentialChannelListenerInjectable,
      credentialHandlerInjectable,
      credentialStoreInjectable,
      credentialsApiInjectable,
    );
    di.override(credentialStoreInjectable, () => store as unknown as CredentialStore);
    const listener = di.inject(credentialChannelListenerInjectable);
    expect(listener.channel).toBe(credentialsChannel);
    handler = async (request) => listener.handler(request);
  });

  it.each(["get", "set", "delete", "list"])(
    "refuses mismatched scopes for %s before touching storage",
    async (operation) => {
      await expect(
        handler({
          extensionId: "extension-a",
          scope: "extension-b",
          operation,
          key: "token",
          value: "secret",
        } as CredentialRequest),
      ).rejects.toThrow("scope must match");
      for (const method of Object.values(store)) expect(method).not.toHaveBeenCalled();
    },
  );

  it.each([
    { extensionId: "core", scope: "core", operation: "list" },
    { extensionId: "extension", scope: "core", operation: "list" },
    { scope: "extension", operation: "list" },
    { extensionId: "../extension", scope: "../extension", operation: "list" },
    { extensionId: "extension", scope: "extension", operation: "unknown" },
    null,
  ])("refuses reserved, missing or malformed claims", async (request) => {
    await expect(handler(request as CredentialRequest)).rejects.toThrow();
    for (const method of Object.values(store)) expect(method).not.toHaveBeenCalled();
  });

  it("dispatches all four operations to the matching namespace", async () => {
    const identity = { extensionId: "@example/extension", scope: "@example/extension" };
    store.get.mockResolvedValue("secret");
    store.list.mockResolvedValue(["token"]);
    expect(await handler({ ...identity, operation: "get", key: "token" })).toEqual({ value: "secret" });
    await handler({ ...identity, operation: "set", key: "token", value: "secret" });
    await handler({ ...identity, operation: "delete", key: "token" });
    expect(await handler({ ...identity, operation: "list" })).toEqual({ keys: ["token"] });
    expect(store.get).toHaveBeenCalledWith(identity.scope, "token");
    expect(store.set).toHaveBeenCalledWith(identity.scope, "token", "secret");
    expect(store.delete).toHaveBeenCalledWith(identity.scope, "token");
    expect(store.list).toHaveBeenCalledWith(identity.scope);
  });

  it("uses the service directly through the main API and also refuses core", async () => {
    const api = di.inject(credentialsInjectionToken);
    store.get.mockResolvedValue("secret");
    store.list.mockResolvedValue(["token"]);
    await api.set("extension", "token", "secret");
    expect(await api.get("extension", "token")).toBe("secret");
    expect(await api.list("extension")).toEqual(["token"]);
    await api.delete("extension", "token");
    expect(store.set).toHaveBeenCalledWith("extension", "token", "secret");
    await expect(api.list("core")).rejects.toThrow("core is reserved");
  });
});
