/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

/**
 * Computes a short key for a JSON-serializable value, for use as a React `key`
 * or as a cache key that is stable within a session.
 *
 * The key is a fast, non-cryptographic hash of `JSON.stringify(data)`. The
 * algorithm is not part of the contract and may change in any version, so the
 * value must not be persisted or compared with one computed by another
 * version: use {@link sha256Hex} where a digest has to be reproducible.
 * Because it hashes the JSON, two objects with the same entries in a different
 * key order get different keys.
 *
 * @param data A value that `JSON.stringify` can serialize
 * @returns 16 lowercase hex characters
 * @throws {TypeError} if `JSON.stringify` returns `undefined` for `data`, as
 *   for `undefined`, a function or a symbol
 */
export function createReactKey(data: unknown): string {
  const json = JSON.stringify(data) as string | undefined;

  if (json === undefined) {
    throw new TypeError(`Cannot create a key for a value that JSON.stringify does not serialize: ${typeof data}`);
  }

  // cyrb64: two 32-bit Murmur-style hashes over the UTF-16 code units, mixed
  // into each other at the end.
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;

  for (let i = 0; i < json.length; i++) {
    const ch = json.charCodeAt(i);

    h1 = Math.imul(h1 ^ ch, 0x9e3779b1);
    h2 = Math.imul(h2 ^ ch, 0x5f356495);
  }

  h1 = Math.imul(h1 ^ (h1 >>> 16), 0x85ebca6b);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 0xc2b2ae35);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 0x85ebca6b);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 0xc2b2ae35);

  return (h2 >>> 0).toString(16).padStart(8, "0") + (h1 >>> 0).toString(16).padStart(8, "0");
}
