/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// Encode/decode utf-8 base64 string
import { Buffer } from "node:buffer";

const base64Regex = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2,3})?$/;

function assertBase64(data: string): string {
  if (!base64Regex.test(data)) {
    throw new Error("Input is not valid base64");
  }

  return data.padEnd(data.length + ((4 - (data.length % 4)) % 4), "=");
}

/**
 * Computes utf-8 from base64
 * @param data A Base64 encoded string
 * @returns The original utf-8 string
 * @throws if the decoded bytes are not valid utf-8 (e.g. the input was not
 *   actually base64-encoded), matching the previous crypto-js behavior that
 *   callers rely on to detect non-base64 input
 */
function decode(data: string): string {
  return new TextDecoder("utf-8", { fatal: true }).decode(Buffer.from(assertBase64(data), "base64"));
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
