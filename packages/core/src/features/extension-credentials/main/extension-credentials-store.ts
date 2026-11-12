/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import path from "node:path";
import { sanitizeExtensionName } from "../../../extensions/lens-extension";
import { assertCredentialKey, assertCredentialValue, isCredentialKey } from "../common/validation";

import type { Logger } from "@freelensapp/logger";

import type { ExtensionCredentialsBackend } from "../common/extension-credentials";

/** The part of Electron's `safeStorage` the store uses. */
export interface CredentialsSafeStorage {
  isAsyncEncryptionAvailable(): Promise<boolean>;
  encryptStringAsync(plainText: string): Promise<Buffer>;
  decryptStringAsync(encrypted: Buffer): Promise<{ shouldReEncrypt: boolean; result: string }>;
  getSelectedStorageBackend(): string;
}

/** The file operations the store uses, with the signatures of `node:fs/promises`. */
export interface CredentialsFileSystem {
  readFile(path: string, encoding: "utf-8"): Promise<string>;
  writeFile(path: string, data: string, options: { encoding: "utf-8"; mode: number; flag: "wx" }): Promise<void>;
  rename(oldPath: string, newPath: string): Promise<void>;
  rm(path: string, options: { force: true }): Promise<void>;
  mkdir(path: string, options: { recursive: true; mode: number }): Promise<unknown>;
}

export interface ExtensionCredentialsStoreDependencies {
  /** The directory that holds one file per extension. */
  readonly directory: string;
  readonly safeStorage: CredentialsSafeStorage;
  readonly fs: CredentialsFileSystem;
  readonly isLinux: boolean;
  readonly logger: Logger;
  /** Resolves once the app has emitted `ready`, before which Linux cannot tell availability. */
  whenReady(): Promise<void>;
  getRandomId(): string;
}

interface CredentialsFile {
  version: 1;
  /** The ciphertext of each value, in base64, by key. */
  credentials: Record<string, string>;
}

const fileVersion = 1;
const fileNamePattern = /^[A-Za-z0-9][A-Za-z0-9._~-]*$/;

const isErrorWithCode = (error: unknown, code: string) =>
  typeof error === "object" && error !== null && (error as { code?: unknown }).code === code;

/**
 * Keeps the credentials of extensions encrypted with Electron's `safeStorage`,
 * in one file per extension below `directory`.
 *
 * - Every operation on one extension's file waits for the previous one, so a
 *   read-modify-write never loses a concurrent change.
 * - A write goes to a new temporary file with mode `0600`, which is renamed
 *   over the previous file, so a failed write leaves the previous file whole.
 * - A file that cannot be read as a credentials file rejects the operations of
 *   its extension, and only of that extension. It is never replaced silently.
 * - No error carries a key or a value: the messages name the extension only.
 */
export class ExtensionCredentialsStore implements ExtensionCredentialsBackend {
  private readonly queues = new Map<string, Promise<unknown>>();

  constructor(private readonly dependencies: ExtensionCredentialsStoreDependencies) {}

  async isAvailable(): Promise<boolean> {
    await this.dependencies.whenReady();

    // Initializes the asynchronous encryptor, and with it the backend Linux
    // selects, before the backend is asked for.
    const isAvailable = await this.dependencies.safeStorage.isAsyncEncryptionAvailable();

    if (!isAvailable) {
      return false;
    }

    // `basic_text` encrypts with a key that is itself kept in clear text,
    // which is no protection at rest.
    return !(this.dependencies.isLinux && this.dependencies.safeStorage.getSelectedStorageBackend() === "basic_text");
  }

  async get(extensionId: string, key: string): Promise<string | undefined> {
    assertCredentialKey(key);

    return this.enqueue(extensionId, async (fileName) => {
      await this.requireAvailable();

      const credentials = await this.read(extensionId, fileName);
      const encrypted = credentials.get(key);

      if (encrypted === undefined) {
        return undefined;
      }

      const { result, shouldReEncrypt } = await this.decrypt(extensionId, encrypted);

      if (shouldReEncrypt) {
        try {
          credentials.set(key, await this.encrypt(extensionId, result));
          await this.write(extensionId, fileName, credentials);
        } catch (error) {
          // The value was read; it stays under the previous key until a later
          // read or write succeeds in replacing it.
          this.dependencies.logger.warn(
            `[EXTENSION-CREDENTIALS]: could not encrypt a credential of "${extensionId}" again with the current key`,
            { error: error instanceof Error ? error.message : String(error) },
          );
        }
      }

      return result;
    });
  }

  async set(extensionId: string, key: string, value: string): Promise<void> {
    assertCredentialKey(key);
    assertCredentialValue(value);

    return this.enqueue(extensionId, async (fileName) => {
      await this.requireAvailable();

      const credentials = await this.read(extensionId, fileName);

      credentials.set(key, await this.encrypt(extensionId, value));
      await this.write(extensionId, fileName, credentials);
    });
  }

  async delete(extensionId: string, key: string): Promise<void> {
    assertCredentialKey(key);

    return this.enqueue(extensionId, async (fileName) => {
      await this.requireAvailable();

      const credentials = await this.read(extensionId, fileName);

      if (!credentials.delete(key)) {
        return;
      }

      if (credentials.size === 0) {
        await this.dependencies.fs.rm(this.pathOf(fileName), { force: true });
      } else {
        await this.write(extensionId, fileName, credentials);
      }
    });
  }

  async keys(extensionId: string): Promise<string[]> {
    return this.enqueue(extensionId, async (fileName) => {
      await this.requireAvailable();

      const credentials = await this.read(extensionId, fileName);

      return [...credentials.keys()].sort();
    });
  }

  async remove(extensionId: string): Promise<void> {
    return this.enqueue(extensionId, async (fileName) => {
      await this.dependencies.fs.rm(this.pathOf(fileName), { force: true });
    });
  }

  private async requireAvailable() {
    if (!(await this.isAvailable())) {
      throw new Error("Encrypted credential storage is not available: the system has no secret store to encrypt with");
    }
  }

  /**
   * The file name of an extension's credentials: its sanitized ID, the name
   * the host uses for the extension elsewhere in the user data directory. An
   * ID that would not make a plain file name is rejected rather than escaped,
   * so that no ID can reach outside the directory.
   */
  private fileNameOf(extensionId: string) {
    const sanitized = typeof extensionId === "string" ? sanitizeExtensionName(extensionId) : "";

    if (!fileNamePattern.test(sanitized)) {
      throw new TypeError("The extension ID does not make a valid file name for its credentials");
    }

    return `${sanitized}.json`;
  }

  private pathOf(fileName: string) {
    return path.join(this.dependencies.directory, fileName);
  }

  private enqueue<T>(extensionId: string, operation: (fileName: string) => Promise<T>): Promise<T> {
    const fileName = this.fileNameOf(extensionId);
    const run = () => operation(fileName);
    const previous = this.queues.get(fileName) ?? Promise.resolve();
    const result = previous.then(run, run);
    const settled = result.then(
      () => {},
      () => {},
    );

    this.queues.set(fileName, settled);
    void settled.then(() => {
      if (this.queues.get(fileName) === settled) {
        this.queues.delete(fileName);
      }
    });

    return result;
  }

  private async read(extensionId: string, fileName: string): Promise<Map<string, string>> {
    let contents: string;

    try {
      contents = await this.dependencies.fs.readFile(this.pathOf(fileName), "utf-8");
    } catch (error) {
      if (isErrorWithCode(error, "ENOENT")) {
        return new Map();
      }

      throw new Error(`Could not read the credentials file of "${extensionId}"`, { cause: error });
    }

    // Not the parser's error: a `SyntaxError` of `JSON.parse` quotes the text
    // around the fault, and that text is the file.
    let parsed: unknown;

    try {
      parsed = JSON.parse(contents);
    } catch {
      parsed = undefined;
    }

    const credentials = this.parseCredentialsFile(parsed);

    if (!credentials) {
      throw new Error(`The credentials file of "${extensionId}" is not a valid credentials file`);
    }

    return credentials;
  }

  private parseCredentialsFile(parsed: unknown): Map<string, string> | undefined {
    if (typeof parsed !== "object" || parsed === null) {
      return undefined;
    }

    const { version, credentials } = parsed as Partial<CredentialsFile>;

    if (version !== fileVersion || typeof credentials !== "object" || credentials === null) {
      return undefined;
    }

    const entries = Object.entries(credentials);

    if (entries.some(([key, value]) => !isCredentialKey(key) || typeof value !== "string")) {
      return undefined;
    }

    // A map rather than the parsed object, so that a key such as `__proto__`
    // is a key like any other.
    return new Map(entries);
  }

  private async write(extensionId: string, fileName: string, credentials: Map<string, string>) {
    const contents: CredentialsFile = {
      version: fileVersion,
      credentials: Object.fromEntries(credentials),
    };
    const filePath = this.pathOf(fileName);
    const temporaryPath = `${filePath}.${this.dependencies.getRandomId()}.tmp`;

    try {
      await this.dependencies.fs.mkdir(this.dependencies.directory, { recursive: true, mode: 0o700 });
      await this.dependencies.fs.writeFile(temporaryPath, `${JSON.stringify(contents, null, 2)}\n`, {
        encoding: "utf-8",
        mode: 0o600,
        flag: "wx",
      });
      await this.dependencies.fs.rename(temporaryPath, filePath);
    } catch (error) {
      await this.dependencies.fs.rm(temporaryPath, { force: true }).catch(() => {});

      throw new Error(`Could not write the credentials file of "${extensionId}"`, { cause: error });
    }
  }

  private async encrypt(extensionId: string, value: string): Promise<string> {
    try {
      const encrypted = await this.dependencies.safeStorage.encryptStringAsync(value);

      return encrypted.toString("base64");
    } catch {
      throw new Error(`Could not encrypt a credential of "${extensionId}"`);
    }
  }

  private async decrypt(extensionId: string, encrypted: string) {
    try {
      return await this.dependencies.safeStorage.decryptStringAsync(Buffer.from(encrypted, "base64"));
    } catch {
      throw new Error(`Could not decrypt a credential of "${extensionId}"`);
    }
  }
}
