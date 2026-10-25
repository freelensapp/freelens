/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { requestFromChannelInjectionToken } from "@freelensapp/messaging";
import { createContainer, getInjectable } from "@ogre-tools/injectable";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Credentials } from "../../../extensions/common-api/credentials";
import { setDiForExtensionApi } from "../../../extensions/extension-api-di/extension-api-di";
import { credentialsChannel } from "../common/channel";
import credentialsApiInjectable from "./credentials-api.injectable";

describe("Common.Credentials in the renderer", () => {
  const request = vi.fn();

  beforeEach(() => {
    request.mockReset();
    const di = createContainer("renderer-credentials-test");
    di.register(
      credentialsApiInjectable,
      getInjectable({
        id: "test-credential-request",
        instantiate: () => request,
        injectionToken: requestFromChannelInjectionToken,
      }),
    );
    setDiForExtensionApi(di, "renderer");
  });

  it("sends matching package name claims and returns typed results for all operations", async () => {
    request
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ value: "secret" })
      .mockResolvedValueOnce({ keys: ["token"] })
      .mockResolvedValueOnce({});
    await Credentials.set("@example/extension", "token", "secret");
    expect(await Credentials.get("@example/extension", "token")).toBe("secret");
    expect(await Credentials.list("@example/extension")).toEqual(["token"]);
    await Credentials.delete("@example/extension", "token");
    const identity = { extensionId: "@example/extension", scope: "@example/extension" };
    expect(request.mock.calls).toEqual([
      [credentialsChannel, { ...identity, operation: "set", key: "token", value: "secret" }],
      [credentialsChannel, { ...identity, operation: "get", key: "token" }],
      [credentialsChannel, { ...identity, operation: "list" }],
      [credentialsChannel, { ...identity, operation: "delete", key: "token" }],
    ]);
  });

  it("returns undefined for a missing key and propagates service errors", async () => {
    request.mockResolvedValueOnce({});
    expect(await Credentials.get("extension", "missing")).toBeUndefined();
    request.mockRejectedValueOnce(new Error("Secure credential storage is unavailable."));
    await expect(Credentials.set("extension", "token", "secret")).rejects.toThrow("unavailable");
  });

  it("exposes enumerable methods without resolving the service", () => {
    expect(Object.keys(Credentials).sort()).toEqual(["delete", "get", "list", "set"]);
    expect(request).not.toHaveBeenCalled();
  });
});
