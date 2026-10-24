/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { describe, expect, it, vi } from "vitest";
import { createCredentialsApi } from "./create-credentials-api";

import type { RequestCredentials } from "./types";

describe("createCredentialsApi", () => {
  it("returns missing values and keys without inventing credentials", async () => {
    const request = vi.fn<RequestCredentials>().mockResolvedValue({});
    const api = createCredentialsApi(request);

    expect(await api.get("extension", "missing")).toBeUndefined();
    expect(await api.list("extension")).toEqual([]);
    expect(request.mock.calls).toEqual([
      [{ extensionId: "extension", scope: "extension", operation: "get", key: "missing" }],
      [{ extensionId: "extension", scope: "extension", operation: "list" }],
    ]);
  });

  it.each(["get", "set", "delete", "list"] as const)("propagates %s failures", async (operation) => {
    const error = new Error("Secure credential storage is unavailable.");
    const request = vi.fn<RequestCredentials>().mockRejectedValue(error);
    const api = createCredentialsApi(request);

    await expect(api[operation]("extension", "token", "value")).rejects.toBe(error);
  });
});
