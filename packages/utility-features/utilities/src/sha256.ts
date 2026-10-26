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
  // Bytes are rewrapped as a view of this realm's `Uint8Array`, without a copy:
  // noble rejects a subclass from another realm, such as bytes from another
  // frame or a Node `Buffer` under jsdom.
  const bytes =
    typeof data === "string" ? utf8ToBytes(data) : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);

  return bytesToHex(sha256(bytes));
}
