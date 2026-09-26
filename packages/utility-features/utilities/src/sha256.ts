/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// Synchronous SHA-256 without Node, so it runs the same in the renderer and in
// main. Web Crypto `crypto.subtle.digest` is asynchronous only.
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";

/**
 * Computes the SHA-256 digest of `data`.
 *
 * Gives the same result as `createHash("sha256").update(data).digest("hex")`
 * from `node:crypto`, without needing Node.
 *
 * @param data A string, which is hashed as its UTF-8 encoding, or bytes
 * @returns The full 64-character lowercase hex digest
 */
export function sha256Hex(data: string | Uint8Array): string {
  return bytesToHex(sha256(typeof data === "string" ? utf8ToBytes(data) : data));
}

/**
 * Computes a short, stable hash of a JSON-serializable value, for use as a
 * React `key` or a cache key.
 *
 * The value is hashed through `JSON.stringify`, so two objects with the same
 * entries in a different key order hash differently. It is the first 16 hex
 * characters of the SHA-256 of that JSON, which is not meant to be collision
 * resistant: use {@link sha256Hex} where the digest has to be the full one.
 *
 * @param data A value that `JSON.stringify` can serialize
 * @returns 16 lowercase hex characters
 * @throws {TypeError} if `JSON.stringify` returns `undefined` for `data`, as
 *   for `undefined`, a function or a symbol
 */
export function createHash(data: unknown): string {
  const json = JSON.stringify(data) as string | undefined;

  if (json === undefined) {
    throw new TypeError(`Cannot hash a value that JSON.stringify does not serialize: ${typeof data}`);
  }

  return sha256Hex(json).slice(0, 16);
}
