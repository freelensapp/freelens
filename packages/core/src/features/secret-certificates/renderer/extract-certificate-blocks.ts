/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { base64 } from "@freelensapp/utilities";

import type { SecretCertificateBlocks } from "../common/channels";

const pemCertificateBlock = /-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g;

/**
 * Finds the PEM certificate blocks in the base64 encoded data of a secret,
 * per key, in the order of the keys. Only the blocks are returned, so that
 * a private key or any other value next to a certificate never leaves the
 * renderer. A key whose value holds no certificate is left out.
 */
export function extractCertificateBlocks(data: Partial<Record<string, string>>): SecretCertificateBlocks[] {
  const blocks: SecretCertificateBlocks[] = [];

  for (const [key, value] of Object.entries(data)) {
    if (!value) {
      continue;
    }

    let decoded: string;

    try {
      decoded = base64.decode(value);
    } catch {
      // Not valid base64, for example while it is being edited
      continue;
    }

    const pems = decoded.match(pemCertificateBlock);

    if (pems) {
      blocks.push({ key, pems });
    }
  }

  return blocks;
}
