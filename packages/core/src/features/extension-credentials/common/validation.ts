/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

export const maxCredentialValueBytes = 64 * 1024;

const keyPattern = /^[A-Za-z0-9._-]{1,128}$/;

export const isCredentialKey = (key: unknown): key is string => typeof key === "string" && keyPattern.test(key);

// The messages name neither the key nor the value: a value passed where a key
// belongs must not end up in an error, and from there in a log.
export function assertCredentialKey(key: unknown): asserts key is string {
  if (!isCredentialKey(key)) {
    throw new TypeError("A credential key must be 1 to 128 characters of A-Z, a-z, 0-9, '.', '_' and '-'");
  }
}

export function assertCredentialValue(value: unknown): asserts value is string {
  if (typeof value !== "string") {
    throw new TypeError("A credential value must be a string");
  }

  // Cheap rejection first: a UTF-8 encoding is at least as long as the string.
  if (value.length > maxCredentialValueBytes || new TextEncoder().encode(value).byteLength > maxCredentialValueBytes) {
    throw new TypeError(`A credential value must be at most ${maxCredentialValueBytes} bytes in UTF-8`);
  }
}
