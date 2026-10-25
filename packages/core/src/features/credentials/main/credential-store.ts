/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { randomUUID } from "node:crypto";
import * as fs from "node:fs/promises";
import path from "node:path";
import { assertCredentialKey, assertCredentialScope } from "../common/types";

export interface CredentialEncryption {
  isEncryptionAvailable(): boolean;
  encryptString(value: string): Buffer;
  decryptString(value: Buffer): string;
  getSelectedStorageBackend?(): string;
}

interface CredentialFile {
  version: 1;
  entries: Record<string, string>;
}

/** Internal main-process store. Only trusted app code may use the reserved core scope. */
export class CredentialStore {
  private pending: Promise<unknown> = Promise.resolve();
  private readonly filePath: string;

  constructor(
    userDataDirectory: string,
    private readonly encryption: CredentialEncryption,
    private readonly fileSystem = fs,
    private readonly platform = process.platform,
  ) {
    this.filePath = path.join(userDataDirectory, "credentials.json");
  }

  get(scope: string, key: string): Promise<string | undefined> {
    return this.run(async () => {
      const entry = this.entryName(scope, key);
      const encrypted = (await this.read()).entries[entry];

      if (encrypted === undefined) return undefined;

      try {
        return this.encryption.decryptString(Buffer.from(encrypted, "base64"));
      } catch {
        throw new Error("Unable to decrypt credential with the operating system secret store.");
      }
    });
  }

  set(scope: string, key: string, value: string): Promise<void> {
    return this.run(async () => {
      const entry = this.entryName(scope, key);

      if (typeof value !== "string") throw new Error("Credential value must be a string.");

      const data = await this.read();

      try {
        data.entries[entry] = this.encryption.encryptString(value).toString("base64");
      } catch {
        throw new Error("Unable to encrypt credential with the operating system secret store.");
      }

      await this.write(data);
    });
  }

  delete(scope: string, key: string): Promise<void> {
    return this.run(async () => {
      const entry = this.entryName(scope, key);
      const data = await this.read();

      if (!Object.hasOwn(data.entries, entry)) return;

      delete data.entries[entry];
      await this.write(data);
    });
  }

  list(scope: string): Promise<string[]> {
    return this.run(async () => {
      assertCredentialScope(scope);
      const prefix = `${scope}/`;

      return Object.keys((await this.read()).entries)
        .filter((entry) => entry.startsWith(prefix))
        .map((entry) => entry.slice(prefix.length))
        .sort();
    });
  }

  private entryName(scope: string, key: string): string {
    assertCredentialScope(scope);
    assertCredentialKey(key);

    return `${scope}/${key}`;
  }

  private run<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.pending.then(() => {
      if (
        !this.encryption.isEncryptionAvailable() ||
        (this.platform === "linux" && this.encryption.getSelectedStorageBackend?.() === "basic_text")
      ) {
        throw new Error(
          "Secure credential storage is unavailable. Unlock or configure the operating system secret store.",
        );
      }

      return operation();
    });

    // A failed operation must not prevent later requests from completing.
    this.pending = result.catch(() => undefined);

    return result;
  }

  private async read(): Promise<CredentialFile> {
    let contents: string;

    try {
      contents = await this.fileSystem.readFile(this.filePath, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return { version: 1, entries: {} };
      throw new Error("Unable to read credential store.");
    }

    try {
      const data = JSON.parse(contents);

      if (data?.version !== 1 || !data.entries || typeof data.entries !== "object" || Array.isArray(data.entries)) {
        throw new Error();
      }

      for (const [entry, value] of Object.entries(data.entries)) {
        const separator = entry.lastIndexOf("/");

        if (separator <= 0) throw new Error();

        this.entryName(entry.slice(0, separator), entry.slice(separator + 1));
        if (typeof value !== "string" || !value.length || Buffer.from(value, "base64").toString("base64") !== value) {
          throw new Error();
        }
      }

      return data;
    } catch {
      // Never include parsed content or underlying exceptions, which could contain secrets.
      throw new Error("Invalid or unsupported credential store. The file has not been changed.");
    }
  }

  private async write(data: CredentialFile): Promise<void> {
    const temporaryPath = `${this.filePath}.${randomUUID()}.tmp`;
    let created = false;

    try {
      await this.fileSystem.mkdir(path.dirname(this.filePath), { recursive: true, mode: 0o700 });
      const handle = await this.fileSystem.open(temporaryPath, "wx", 0o600);
      created = true;

      try {
        await handle.writeFile(JSON.stringify(data), "utf8");
        await handle.sync();
      } finally {
        await handle.close();
      }

      await this.fileSystem.rename(temporaryPath, this.filePath);
    } catch {
      throw new Error("Unable to save credential store. The previous file has not been replaced.");
    } finally {
      if (created) await this.fileSystem.unlink(temporaryPath).catch(() => undefined);
    }
  }
}
