/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

/**
 * The credentials of one extension: string values kept encrypted at rest with
 * a key that the operating system's secret store holds (the Keychain on macOS,
 * DPAPI on Windows, libsecret or KWallet on Linux).
 *
 * Encrypted at rest means a value is never written to disk in clear text. It
 * is not a boundary between extensions, nor a protection against programs
 * running as the same user.
 *
 * Keys are 1 to 128 characters of `A-Z`, `a-z`, `0-9`, `.`, `_` and `-`;
 * values are strings of at most 64 KiB in UTF-8. When the system has no secret
 * store, `isAvailable()` resolves to `false` and every other method rejects:
 * there is no fallback to clear text.
 */
export interface ExtensionCredentials {
  /**
   * Whether the system has a secret store to encrypt with. On Linux it is
   * `false` for the `basic_text` backend, which keeps the key in clear text.
   */
  isAvailable(): Promise<boolean>;
  /** The value under `key`, or `undefined` when there is none. */
  get(key: string): Promise<string | undefined>;
  /** Stores `value` under `key`, replacing a previous value. */
  set(key: string, value: string): Promise<void>;
  /** Removes the value under `key`; removing a key that has none does nothing. */
  delete(key: string): Promise<void>;
  /** The keys that have a value, sorted. */
  keys(): Promise<string[]>;
}

/**
 * What each process implements to keep the credentials, scoped by an
 * extension ID that the caller has already derived from an instance the host
 * loaded. Main keeps the files; the renderer asks main over a request channel.
 */
export interface ExtensionCredentialsBackend {
  isAvailable(): Promise<boolean>;
  get(extensionId: string, key: string): Promise<string | undefined>;
  set(extensionId: string, key: string, value: string): Promise<void>;
  delete(extensionId: string, key: string): Promise<void>;
  keys(extensionId: string): Promise<string[]>;
  /** Removes every credential of the extension, whether or not the store is available. */
  remove(extensionId: string): Promise<void>;
}
