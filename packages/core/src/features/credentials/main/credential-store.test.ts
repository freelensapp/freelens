/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import * as fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CredentialStore } from "./credential-store";
import type { PathLike } from "node:fs";

import type { CredentialEncryption } from "./credential-store";

// Deliberately fake encryption: tests never access a real OS keychain.
const transform = (value: Buffer) => Buffer.from(value.map((byte) => byte ^ 0xa5));

describe("CredentialStore", () => {
  let directory: string;
  let file: string;
  let encryption: CredentialEncryption;
  let store: CredentialStore;

  beforeEach(async () => {
    directory = await fs.mkdtemp(path.join(os.tmpdir(), "freelens-credentials-test-"));
    file = path.join(directory, "credentials.json");
    encryption = {
      isEncryptionAvailable: vi.fn(() => true),
      encryptString: vi.fn((value) => transform(Buffer.from(`fake:${value}`))),
      decryptString: vi.fn((value) => transform(value).toString().slice(5)),
      getSelectedStorageBackend: vi.fn(() => "gnome_libsecret"),
    };
    store = new CredentialStore(directory, encryption);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await fs.rm(directory, { recursive: true, force: true });
  });

  it("round trips across store instances, updates values, and writes only encrypted blobs", async () => {
    await store.set("@example/extension", "token", "synthetic-secret");
    expect(await store.get("@example/extension", "token")).toBe("synthetic-secret");
    const contents = await fs.readFile(file, "utf8");
    expect(contents).not.toContain("synthetic-secret");
    expect(JSON.parse(contents)).toEqual({
      version: 1,
      entries: { "@example/extension/token": transform(Buffer.from("fake:synthetic-secret")).toString("base64") },
    });
    const reopened = new CredentialStore(directory, encryption);
    expect(await reopened.get("@example/extension", "token")).toBe("synthetic-secret");
    await reopened.set("@example/extension", "token", "replacement");
    expect(await store.get("@example/extension", "token")).toBe("replacement");
  });

  it("supports empty values and missing entries", async () => {
    expect(await store.get("extension", "missing")).toBeUndefined();
    expect(await store.list("extension")).toEqual([]);
    await store.delete("extension", "missing");
    await store.set("extension", "empty", "");
    expect(await store.get("extension", "empty")).toBe("");
  });

  it("separates scopes and lists only keys without decrypting", async () => {
    await store.set("@example/one", "token", "one");
    await store.set("@example/two", "token", "two");
    await store.set("@example/one", "other", "other-value");
    await store.set("core", "token", "app-value");
    expect(await store.list("@example/one")).toEqual(["other", "token"]);
    expect(encryption.decryptString).not.toHaveBeenCalled();
    await store.delete("@example/one", "token");
    expect(await store.get("@example/one", "token")).toBeUndefined();
    expect(await store.get("@example/two", "token")).toBe("two");
    expect(await store.get("core", "token")).toBe("app-value");
    expect(await new CredentialStore(directory, encryption).list("@example/one")).toEqual(["other"]);
  });

  it("serializes concurrent updates without losing keys", async () => {
    await Promise.all(Array.from({ length: 12 }, (_, index) => store.set("extension", `key-${index}`, `${index}`)));
    expect(await store.list("extension")).toHaveLength(12);
    await Promise.all([
      store.set("extension", "token", "first"),
      store.delete("extension", "token"),
      store.set("extension", "token", "last"),
    ]);
    expect(await store.get("extension", "token")).toBe("last");
  });

  it.each(["get", "set", "delete", "list"] as const)("refuses %s when encryption is unavailable", async (operation) => {
    vi.mocked(encryption.isEncryptionAvailable).mockReturnValue(false);
    await expect(store[operation]("extension", "token", "synthetic-secret")).rejects.toThrow(
      "Secure credential storage is unavailable",
    );
    expect(await fs.readdir(directory)).toEqual([]);
    expect(encryption.encryptString).not.toHaveBeenCalled();
    expect(encryption.decryptString).not.toHaveBeenCalled();
  });

  it("refuses Linux basic_text even when encryption reports available, then recovers", async () => {
    store = new CredentialStore(directory, encryption, fs, "linux");
    vi.mocked(encryption.getSelectedStorageBackend!).mockReturnValue("basic_text");
    await expect(store.set("extension", "token", "secret")).rejects.toThrow("unavailable");
    vi.mocked(encryption.getSelectedStorageBackend!).mockReturnValue("gnome_libsecret");
    await store.set("extension", "token", "secret");
    expect(await store.get("extension", "token")).toBe("secret");
  });

  it.each(["", "../other", "@scope", "@scope/ext/other", "extension/other", "extension\n", "extension\r"])(
    "rejects invalid scope %p",
    async (scope) => {
      await expect(store.set(scope, "token", "secret")).rejects.toThrow("Invalid credential scope");
    },
  );

  it.each(["", "../token", "other/token", "back\\slash", "nul\0key"])("rejects invalid key %p", async (key) => {
    await expect(store.set("extension", key, "secret")).rejects.toThrow("Invalid credential key");
  });

  it("rejects non-string values without including them in errors", async () => {
    await expect(store.set("extension", "token", { secret: "secret" } as unknown as string)).rejects.toThrow(
      "Credential value must be a string.",
    );
  });

  it("atomically renames a complete, owner-only temporary file over the previous file", async () => {
    await store.set("extension", "token", "previous");
    const before = await fs.readFile(file, "utf8");
    const rename = vi.fn(async (from: PathLike, to: PathLike) => {
      expect(await fs.readFile(file, "utf8")).toBe(before);
      expect(path.dirname(String(from))).toBe(directory);
      expect(to).toBe(file);
      expect(JSON.parse(await fs.readFile(from, "utf8")).version).toBe(1);
      if (process.platform !== "win32") expect((await fs.stat(from)).mode & 0o777).toBe(0o600);
      await fs.rename(from, to);
    });
    store = new CredentialStore(directory, encryption, { ...fs, rename });
    await store.set("extension", "token", "next");
    expect(rename).toHaveBeenCalledTimes(1);
    if (process.platform !== "win32") expect((await fs.stat(file)).mode & 0o777).toBe(0o600);
    expect(await fs.readdir(directory)).toEqual(["credentials.json"]);
  });

  it("keeps the old file and cleans up when rename fails, then accepts another write", async () => {
    await store.set("extension", "token", "previous");
    const before = await fs.readFile(file, "utf8");
    const rename = vi
      .fn<typeof fs.rename>()
      .mockRejectedValueOnce(new Error("synthetic-secret"))
      .mockImplementation(fs.rename);
    store = new CredentialStore(directory, encryption, { ...fs, rename });
    await expect(store.set("extension", "token", "next")).rejects.toThrow(
      "Unable to save credential store. The previous file has not been replaced.",
    );
    expect(await fs.readFile(file, "utf8")).toBe(before);
    expect(await fs.readdir(directory)).toEqual(["credentials.json"]);
    expect(await store.get("extension", "token")).toBe("previous");
    await store.set("extension", "token", "recovered");
    expect(await store.get("extension", "token")).toBe("recovered");
  });

  it("preserves the previous file and removes the temporary file when syncing fails", async () => {
    await store.set("extension", "token", "previous");
    const before = await fs.readFile(file, "utf8");
    const rename = vi.fn(fs.rename);
    const open: typeof fs.open = async (...args) => {
      const handle = await fs.open(...args);
      vi.spyOn(handle, "sync").mockRejectedValueOnce(new Error("simulated disk failure"));
      return handle;
    };
    store = new CredentialStore(directory, encryption, { ...fs, open, rename });
    await expect(store.set("extension", "token", "next")).rejects.toThrow("Unable to save credential store");
    expect(rename).not.toHaveBeenCalled();
    expect(await fs.readFile(file, "utf8")).toBe(before);
    expect(await fs.readdir(directory)).toEqual(["credentials.json"]);
  });

  it.each([
    "malformed-secret",
    JSON.stringify({ version: 2, entries: {} }),
    JSON.stringify({ version: 1, entries: [] }),
    JSON.stringify({ version: 1, entries: { "extension/token": "plaintext-secret" } }),
    JSON.stringify({ version: 1, entries: { missingSeparator: "YQ==" } }),
  ])("refuses corrupt or unsupported files without replacing them", async (contents) => {
    await fs.writeFile(file, contents);
    await expect(store.set("extension", "token", "new")).rejects.toThrow(
      "Invalid or unsupported credential store. The file has not been changed.",
    );
    expect(await fs.readFile(file, "utf8")).toBe(contents);
  });

  it("does not expose encryption errors or replace existing data on failure", async () => {
    await store.set("extension", "token", "previous");
    const before = await fs.readFile(file, "utf8");
    vi.mocked(encryption.encryptString).mockImplementation(() => {
      throw new Error("synthetic-secret");
    });
    await expect(store.set("extension", "token", "next")).rejects.toThrow(
      "Unable to encrypt credential with the operating system secret store.",
    );
    expect(await fs.readFile(file, "utf8")).toBe(before);
    vi.mocked(encryption.decryptString).mockImplementation(() => {
      throw new Error("synthetic-secret");
    });
    await expect(store.get("extension", "token")).rejects.toThrow(
      "Unable to decrypt credential with the operating system secret store.",
    );
  });
});
