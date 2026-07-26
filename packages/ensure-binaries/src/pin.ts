/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { type Artifact, artifactKey } from "./artifacts.js";
import { downloadToFile, fetchChecksum } from "./download.js";
import { verifyArtifact } from "./verify.js";

/**
 * Establishing the digest of one published artifact.
 *
 * Both generators that write a pin - the bundled binaries lock and the kubectl
 * download checksums - need exactly this: fetch the vendor checksum, download
 * the bytes and hash them, then prove who produced them. Downloading rather
 * than trusting the published checksum is the point. It is what makes the pin
 * describe bytes that were actually served, and it is why the flow lives here
 * instead of being written twice.
 */

/** Runs tasks with a bounded number in flight, preserving input order. */
export async function mapWithConcurrency<T, R>(items: T[], limit: number, task: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;

  async function worker(): Promise<void> {
    while (next < items.length) {
      const index = next++;

      results[index] = await task(items[index] as T);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));

  return results;
}

/**
 * Downloads an artifact into a temporary directory, checks it against the
 * checksum its publisher advertises, verifies the publisher's signature over
 * it, and returns the digest of the bytes that arrived.
 *
 * Nothing survives the call but the digest: the download is removed either way,
 * so peak disk stays at roughly one artifact per concurrent caller.
 */
export async function pinArtifact(artifact: Artifact, label?: string): Promise<string> {
  const workDir = await mkdtemp(path.join(tmpdir(), "freelens-pin-"));

  try {
    const artifactPath = path.join(workDir, path.basename(artifact.url));
    const published = await fetchChecksum(artifact.checksumUrl);
    const actual = await downloadToFile(artifact.url, artifactPath);

    if (actual !== published) {
      throw new Error(
        `${artifact.url} does not match its published checksum: ${artifact.checksumUrl} says ${published}, the download hashes to ${actual}`,
      );
    }

    // Only pin a digest whose provenance we could establish.
    const verifiedBy = await verifyArtifact(artifact, actual, artifactPath, workDir);

    console.log(`  ${label ?? `${artifact.tool} ${artifactKey(artifact)}`} ${actual}\n    verified: ${verifiedBy}`);

    return actual;
  } finally {
    await rm(workDir, { force: true, recursive: true });
  }
}
