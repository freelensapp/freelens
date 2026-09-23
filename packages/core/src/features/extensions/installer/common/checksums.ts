/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { createHash } from "node:crypto";

/**
 * How much of the tarball digest goes into the install path. Eight hex
 * characters are enough because the digest only has to distinguish builds of
 * the same name and version, and it is not a security boundary.
 */
export const shortDigestLength = 8;

const supportedAlgorithms = ["sha1", "sha256", "sha512"] as const;

export type SupportedAlgorithm = (typeof supportedAlgorithms)[number];

export interface ChecksumMismatch {
  algorithm: string;
  expected: string;
  actual: string;
}

/**
 * The identity of an installed build: sha256 over the archive bytes, not over
 * the extracted tree, whose hash depends on extraction order and filesystem.
 */
export function computeTarballDigest(data: Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

export function shortenDigest(digest: string): string {
  return digest.slice(0, shortDigestLength);
}

function isSupportedAlgorithm(algorithm: string): algorithm is SupportedAlgorithm {
  return (supportedAlgorithms as readonly string[]).includes(algorithm);
}

/**
 * Verify a tarball against a Subresource Integrity string of the form npm
 * records in `dist.integrity`, e.g. `sha512-<base64>`.
 *
 * Returns `undefined` when the data matches, and the mismatch otherwise.
 * Throws only when the string is not something we know how to check, which is
 * a different failure: an unverifiable download rather than a corrupt one.
 */
export function verifySubresourceIntegrity(data: Buffer, integrity: string): ChecksumMismatch | undefined {
  const separatorIndex = integrity.indexOf("-");

  if (separatorIndex < 0) {
    throw new Error(`malformed integrity string "${integrity}"`);
  }

  const algorithm = integrity.slice(0, separatorIndex);
  const expected = integrity.slice(separatorIndex + 1);

  if (!isSupportedAlgorithm(algorithm)) {
    throw new Error(`unsupported integrity algorithm "${algorithm}"`);
  }

  const actual = createHash(algorithm).update(data).digest("base64");

  return actual === expected ? undefined : { algorithm, expected, actual };
}

/**
 * Verify a tarball against a hex sha256 digest, as carried by a `.tgz.sha256`
 * sidecar.
 */
export function verifySha256(data: Buffer, expected: string): ChecksumMismatch | undefined {
  const actual = computeTarballDigest(data);
  const wanted = expected.toLowerCase();

  return actual === wanted ? undefined : { algorithm: "sha256", expected: wanted, actual };
}

/**
 * What the source of a tarball vouched for.
 *
 * A registry answers with npm's `dist.integrity`; a URL or a local file can
 * carry a `.tgz.sha256` sidecar beside it. Both establish transfer integrity
 * only: a checksum served by the same host as the tarball says nothing about
 * authenticity, since whoever can rewrite one can rewrite the other.
 */
export type InstallChecksum = { kind: "integrity"; value: string } | { kind: "sha256"; value: string };

export function verifyInstallChecksum(data: Buffer, checksum: InstallChecksum): ChecksumMismatch | undefined {
  return checksum.kind === "integrity"
    ? verifySubresourceIntegrity(data, checksum.value)
    : verifySha256(data, checksum.value);
}

/**
 * Read the digest out of a `.sha256` sidecar.
 *
 * Both the `sha256sum(1)` output format (`<hex>  <filename>`) and a bare digest
 * are accepted, since both are in use. A sidecar we cannot parse is treated as
 * a sidecar we do not have.
 */
export function parseChecksumSidecar(contents: string): string | undefined {
  for (const line of contents.split("\n")) {
    const [token] = line.trim().split(/\s+/);

    if (token && /^[0-9a-f]{64}$/i.test(token)) {
      return token.toLowerCase();
    }
  }

  return undefined;
}
