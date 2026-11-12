/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import fs, { mkdtemp, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ExtensionCredentialsStore } from "../extension-credentials-store";
import { createFakeSafeStorage } from "./fake-safe-storage";

import type { Logger } from "@freelensapp/logger";

import type { CredentialsFileSystem } from "../extension-credentials-store";
import type { FakeSafeStorage } from "./fake-safe-storage";

const secret = "s3cr3t-value-that-must-not-leak";

describe("ExtensionCredentialsStore", () => {
  let root: string;
  let directory: string;
  let safeStorage: FakeSafeStorage;
  let logger: Logger;
  let randomIds: number;

  const createStore = ({ fileSystem = fs as CredentialsFileSystem, isLinux = true } = {}) =>
    new ExtensionCredentialsStore({
      directory,
      safeStorage,
      fs: fileSystem,
      isLinux,
      logger,
      whenReady: async () => {},
      getRandomId: () => `random-${++randomIds}`,
    });

  const fileOf = (name: string) => path.join(directory, `${name}.json`);
  const listDirectory = async () => (await readdir(directory).catch(() => [] as string[])).sort();

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), "freelens-extension-credentials-"));
    directory = path.join(root, "extension-credentials");
    safeStorage = createFakeSafeStorage();
    logger = { debug: vi.fn(), error: vi.fn(), info: vi.fn(), silly: vi.fn(), warn: vi.fn() } as unknown as Logger;
    randomIds = 0;
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("reads a value back in a new store, and never writes it in clear text", async () => {
    await createStore().set("my-extension", "token", secret);

    const store = createStore();

    expect(await store.get("my-extension", "token")).toBe(secret);
    expect(await store.keys("my-extension")).toEqual(["token"]);
    expect(await readFile(fileOf("my-extension"), "utf-8")).not.toContain(secret);
  });

  it.skipIf(process.platform === "win32")("writes the file with mode 0600", async () => {
    await createStore().set("my-extension", "token", secret);

    expect((await stat(fileOf("my-extension"))).mode & 0o777).toBe(0o600);
  });

  it("names the file after the sanitized ID of the extension", async () => {
    await createStore().set("@my-scope/my-extension", "token", secret);

    expect(await listDirectory()).toEqual(["my-scope--my-extension.json"]);
  });

  it("keeps each extension's values apart", async () => {
    const store = createStore();

    await store.set("first-extension", "token", "first");
    await store.set("second-extension", "token", "second");

    expect(await store.get("first-extension", "token")).toBe("first");
    expect(await store.get("second-extension", "token")).toBe("second");
    expect(await store.get("first-extension", "other")).toBeUndefined();
  });

  it("deletes a key, and the file with the last one", async () => {
    const store = createStore();

    await store.set("my-extension", "token", secret);
    await store.set("my-extension", "password", secret);
    await store.delete("my-extension", "token");

    expect(await store.keys("my-extension")).toEqual(["password"]);

    await store.delete("my-extension", "password");
    await store.delete("my-extension", "never-set");

    expect(await store.keys("my-extension")).toEqual([]);
    expect(await listDirectory()).toEqual([]);
  });

  it("loses no value to concurrent writes", async () => {
    const store = createStore();
    const keys = Array.from({ length: 20 }, (_, index) => `key-${String(index).padStart(2, "0")}`);

    await Promise.all(keys.map((key) => store.set("my-extension", key, `value of ${key}`)));

    expect(await createStore().keys("my-extension")).toEqual(keys);
  });

  describe("given one extension's file is corrupt", () => {
    beforeEach(async () => {
      await createStore().set("healthy-extension", "token", "healthy");
      await writeFile(fileOf("broken-extension"), `{"version": 1, "credentials": {"token": "${secret}"`);
    });

    it("rejects that extension's operations with an error that names neither keys nor values", async () => {
      const store = createStore();
      const error = await store.get("broken-extension", "token").catch((error: Error) => error);

      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe(
        'The credentials file of "broken-extension" is not a valid credentials file',
      );
      expect((error as Error).message).not.toContain(secret);
      await expect(store.set("broken-extension", "token", "new")).rejects.toThrow("not a valid credentials file");
      await expect(store.keys("broken-extension")).rejects.toThrow("not a valid credentials file");
    });

    it("does not replace it", async () => {
      await createStore()
        .set("broken-extension", "token", "new")
        .catch(() => {});

      expect(await readFile(fileOf("broken-extension"), "utf-8")).toContain(secret);
    });

    it("leaves another extension working", async () => {
      expect(await createStore().get("healthy-extension", "token")).toBe("healthy");
    });
  });

  it("rejects a file of valid JSON that is not a credentials file", async () => {
    await createStore().set("my-extension", "token", secret);
    await writeFile(fileOf("my-extension"), JSON.stringify({ version: 2, credentials: {} }));

    await expect(createStore().get("my-extension", "token")).rejects.toThrow("not a valid credentials file");
  });

  describe("given the system has no secret store", () => {
    it("is not available, rejects every operation and writes nothing", async () => {
      safeStorage.available = false;

      const store = createStore();

      expect(await store.isAvailable()).toBe(false);
      await expect(store.set("my-extension", "token", secret)).rejects.toThrow(
        "Encrypted credential storage is not available",
      );
      await expect(store.get("my-extension", "token")).rejects.toThrow("not available");
      await expect(store.delete("my-extension", "token")).rejects.toThrow("not available");
      await expect(store.keys("my-extension")).rejects.toThrow("not available");
      expect(await readdir(root)).toEqual([]);
    });

    it("is not available with the basic_text backend of Linux", async () => {
      safeStorage.backend = "basic_text";

      const store = createStore();

      expect(await store.isAvailable()).toBe(false);
      await expect(store.set("my-extension", "token", secret)).rejects.toThrow("not available");
      expect(await readdir(root)).toEqual([]);
    });

    it("asks for the backend on Linux only", async () => {
      safeStorage.backend = "basic_text";
      safeStorage.getSelectedStorageBackend = () => {
        throw new Error("getSelectedStorageBackend is Linux only");
      };

      expect(await createStore({ isLinux: false }).isAvailable()).toBe(true);
    });

    it("waits for the app to be ready before telling", async () => {
      let ready!: () => void;
      const store = new ExtensionCredentialsStore({
        directory,
        safeStorage,
        fs: fs as CredentialsFileSystem,
        isLinux: true,
        logger,
        whenReady: () => new Promise<void>((resolve) => (ready = resolve)),
        getRandomId: () => "random",
      });
      const isAsyncEncryptionAvailable = vi.spyOn(safeStorage, "isAsyncEncryptionAvailable");
      const isAvailable = store.isAvailable();

      await Promise.resolve();
      expect(isAsyncEncryptionAvailable).not.toHaveBeenCalled();

      ready();

      expect(await isAvailable).toBe(true);
    });
  });

  it("encrypts a value again with the current key when asked to", async () => {
    await createStore().set("my-extension", "token", secret);

    const before = await readFile(fileOf("my-extension"), "utf-8");

    safeStorage.keyVersion = 2;

    expect(await createStore().get("my-extension", "token")).toBe(secret);

    const after = await readFile(fileOf("my-extension"), "utf-8");
    const ciphertextOf = (contents: string) => Buffer.from(JSON.parse(contents).credentials.token as string, "base64");

    expect(after).not.toBe(before);
    expect(ciphertextOf(before)[0]).toBe(1);
    expect(ciphertextOf(after)[0]).toBe(2);
    expect(await createStore().get("my-extension", "token")).toBe(secret);
  });

  it("returns the value when encrypting it again fails", async () => {
    await createStore().set("my-extension", "token", secret);
    safeStorage.keyVersion = 2;
    safeStorage.encryptStringAsync = async () => {
      throw new Error("no encrypting today");
    };

    expect(await createStore().get("my-extension", "token")).toBe(secret);
    expect(logger.warn).toHaveBeenCalled();
  });

  it("leaves the previous file in place when a write fails", async () => {
    await createStore().set("my-extension", "token", "previous");

    const failingRename: CredentialsFileSystem = {
      ...(fs as CredentialsFileSystem),
      rename: async () => {
        throw new Error("no renaming today");
      },
    };

    await expect(createStore({ fileSystem: failingRename }).set("my-extension", "token", secret)).rejects.toThrow(
      'Could not write the credentials file of "my-extension"',
    );
    expect(await createStore().get("my-extension", "token")).toBe("previous");
    // Nor a temporary file next to it.
    expect(await listDirectory()).toEqual(["my-extension.json"]);
  });

  it("rejects without the value when decrypting fails", async () => {
    await createStore().set("my-extension", "token", secret);
    safeStorage.keyVersion = 0;

    const error = await createStore()
      .get("my-extension", "token")
      .catch((error: Error) => error);

    expect((error as Error).message).toBe('Could not decrypt a credential of "my-extension"');
  });

  it("removes an extension's file whether or not the store is available", async () => {
    const store = createStore();

    await store.set("my-extension", "token", secret);
    await store.set("other-extension", "token", secret);
    safeStorage.available = false;
    await store.remove("my-extension");
    await store.remove("never-stored");

    expect(await listDirectory()).toEqual(["other-extension.json"]);
  });

  describe("validation", () => {
    it.each(["", "a".repeat(129), "with space", "slash/key", "ключ"])("rejects the key %j", async (key) => {
      await expect(createStore().set("my-extension", key, "value")).rejects.toThrow(TypeError);
    });

    it("accepts a key of 128 characters of the allowed set", async () => {
      const key = `Az09._-${"k".repeat(121)}`;

      await createStore().set("my-extension", key, "value");

      expect(await createStore().keys("my-extension")).toEqual([key]);
    });

    it("accepts a key that is the name of a property of every object", async () => {
      const store = createStore();

      await store.set("my-extension", "__proto__", "value");

      expect(await createStore().get("my-extension", "__proto__")).toBe("value");
      expect(await createStore().get("my-extension", "constructor")).toBeUndefined();
    });

    it("accepts a value of 64 KiB, and rejects one byte more without quoting it", async () => {
      const store = createStore();
      const largest = "é".repeat(32 * 1024);

      await store.set("my-extension", "token", largest);
      expect(await store.get("my-extension", "token")).toBe(largest);

      const error = await store.set("my-extension", "token", `${largest}x`).catch((error: Error) => error);

      expect(error).toBeInstanceOf(TypeError);
      expect((error as Error).message).not.toContain("é");
    });

    it("rejects a value that is not a string", async () => {
      await expect(createStore().set("my-extension", "token", 42 as unknown as string)).rejects.toThrow(TypeError);
    });

    it.each(["../escape", "..", ".", "a/../../b", "nested\\name", ""])(
      "rejects the extension ID %j, which would not make a plain file name",
      async (extensionId) => {
        await expect(createStore().set(extensionId, "token", secret)).rejects.toThrow(TypeError);
        await expect(createStore().remove(extensionId)).rejects.toThrow(TypeError);
        expect(await readdir(root)).toEqual([]);
      },
    );
  });
});
