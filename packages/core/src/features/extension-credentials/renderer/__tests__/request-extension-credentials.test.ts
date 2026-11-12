/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import fs, { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeSafeStorage } from "../../main/__tests__/fake-safe-storage";
import { ExtensionCredentialsStore } from "../../main/extension-credentials-store";
import { handleExtensionCredentialsRequest } from "../../main/handle-extension-credentials-request";
import { createRendererExtensionCredentials } from "../request-extension-credentials";

import type { Logger } from "@freelensapp/logger";

import type { ExtensionCredentialsRequest } from "../../common/channels";
import type { FakeSafeStorage } from "../../main/__tests__/fake-safe-storage";
import type { CredentialsFileSystem } from "../../main/extension-credentials-store";
import type { RequestExtensionCredentials } from "../request-extension-credentials";

// The renderer's side of the request channel, against the main process's
// handler and store: the request crosses as a structured clone, as over IPC.
describe("the renderer's extension credentials", () => {
  let root: string;
  let safeStorage: FakeSafeStorage;
  let store: ExtensionCredentialsStore;
  let request: ReturnType<typeof vi.fn<RequestExtensionCredentials>>;

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), "freelens-extension-credentials-"));
    safeStorage = createFakeSafeStorage();
    store = new ExtensionCredentialsStore({
      directory: root,
      safeStorage,
      fs: fs as CredentialsFileSystem,
      isLinux: true,
      logger: { warn: vi.fn() } as unknown as Logger,
      whenReady: async () => {},
      getRandomId: () => globalThis.crypto.randomUUID(),
    });
    request = vi.fn<RequestExtensionCredentials>(async (message) =>
      structuredClone(await handleExtensionCredentialsRequest(store, structuredClone(message))),
    );
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("performs every operation in the main process", async () => {
    const credentials = createRendererExtensionCredentials(request);

    expect(await credentials.isAvailable()).toBe(true);
    await credentials.set("my-extension", "token", "value");
    expect(await credentials.get("my-extension", "token")).toBe("value");
    expect(await credentials.get("my-extension", "other")).toBeUndefined();
    expect(await credentials.keys("my-extension")).toEqual(["token"]);
    await credentials.delete("my-extension", "token");
    expect(await credentials.keys("my-extension")).toEqual([]);
    await credentials.remove("my-extension");

    expect(request.mock.calls.map(([message]) => message)).toEqual<ExtensionCredentialsRequest[]>([
      { operation: "isAvailable" },
      { operation: "set", extensionId: "my-extension", key: "token", value: "value" },
      { operation: "get", extensionId: "my-extension", key: "token" },
      { operation: "get", extensionId: "my-extension", key: "other" },
      { operation: "keys", extensionId: "my-extension" },
      { operation: "delete", extensionId: "my-extension", key: "token" },
      { operation: "keys", extensionId: "my-extension" },
      { operation: "remove", extensionId: "my-extension" },
    ]);
  });

  it("reaches the values written in the main process", async () => {
    await store.set("my-extension", "token", "from main");

    expect(await createRendererExtensionCredentials(request).get("my-extension", "token")).toBe("from main");
  });

  it("rejects with the message of the main process", async () => {
    safeStorage.available = false;

    const credentials = createRendererExtensionCredentials(request);

    expect(await credentials.isAvailable()).toBe(false);
    await expect(credentials.set("my-extension", "token", "value")).rejects.toThrow(
      "Encrypted credential storage is not available",
    );
  });

  it("rejects with a TypeError where the main process did", async () => {
    await expect(createRendererExtensionCredentials(request).get("my-extension", "not a key")).rejects.toThrow(
      TypeError,
    );
  });

  it("validates in the main process what the renderer sends", async () => {
    const response = await handleExtensionCredentialsRequest(store, {
      operation: "set",
      extensionId: "../escape",
      key: "token",
      value: "value",
    });

    expect(response).toEqual({ status: "rejected", name: "TypeError", message: expect.any(String) });
    expect(
      await handleExtensionCredentialsRequest(store, {
        operation: "drop-tables",
      } as unknown as ExtensionCredentialsRequest),
    ).toEqual({ status: "rejected", name: "TypeError", message: "Unknown operation on extension credentials" });
  });
});
