/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// Encode/decode utf-8 base64 string
import { Buffer } from "node:buffer";

/**
 * Computes utf-8 from base64
 * @param data A Base64 encoded string
 * @returns The original utf-8 string
 * @throws if the decoded bytes are not valid utf-8 (e.g. the input was not
 *   actually base64-encoded), matching the previous crypto-js behavior that
 *   callers rely on to detect non-base64 input
 */
function decode(data: string): string {
  // `Buffer.from(..., "base64")` is lenient and never throws, but
  // `TextDecoder` with `fatal: true` throws on malformed utf-8, preserving the
  // throw-on-invalid contract callers depend on.
  return new TextDecoder("utf-8", { fatal: true }).decode(Buffer.from(data, "base64"));
}

/**
 * Computes base64 from utf-8
 * @param data A normal string
 * @returns A base64 encoded version
 */
function encode(data: string): string {
  return Buffer.from(data, "utf-8").toString("base64");
}

export const base64 = {
  encode,
  decode,
};
