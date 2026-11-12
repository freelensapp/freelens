/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { CredentialsSafeStorage } from "../extension-credentials-store";

export interface FakeSafeStorage extends CredentialsSafeStorage {
  available: boolean;
  backend: string;
  /** The version of the key that encrypts; a value encrypted with an older one asks to be encrypted again. */
  keyVersion: number;
}

const mask = (bytes: Uint8Array, keyVersion: number) => bytes.map((byte) => byte ^ (0x5a + keyVersion));

/**
 * Electron's `safeStorage` as far as the store can tell: a reversible
 * transformation whose output does not contain the plain text, with a key
 * version that can be moved to simulate a rotated key.
 */
export const createFakeSafeStorage = (): FakeSafeStorage => {
  const fake: FakeSafeStorage = {
    available: true,
    backend: "gnome_libsecret",
    keyVersion: 1,
    isAsyncEncryptionAvailable: async () => fake.available,
    getSelectedStorageBackend: () => fake.backend,
    encryptStringAsync: async (plainText) => {
      if (!fake.available) {
        throw new Error("Encryption is not available");
      }

      const keyVersion = fake.keyVersion;

      return Buffer.concat([Buffer.from([keyVersion]), mask(Buffer.from(plainText, "utf-8"), keyVersion)]);
    },
    decryptStringAsync: async (encrypted) => {
      const [keyVersion, ...rest] = encrypted;

      if (keyVersion === undefined || keyVersion > fake.keyVersion) {
        throw new Error("Error while decrypting the ciphertext provided to safeStorage.decryptString.");
      }

      return {
        result: Buffer.from(mask(Uint8Array.from(rest), keyVersion)).toString("utf-8"),
        shouldReEncrypt: keyVersion < fake.keyVersion,
      };
    },
  };

  return fake;
};
