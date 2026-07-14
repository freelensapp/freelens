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
 */
function decode(data: string): string {
  return Buffer.from(data, "base64").toString("utf-8");
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
