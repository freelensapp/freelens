/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { readFile, writeFile } from "node:fs/promises";
import z from "zod";
import { artifactKey, supportedArches, supportedPlatforms } from "./artifacts.js";

/**
 * The committed table of digests for every kubectl the application may download
 * at runtime.
 *
 * It is the same idea as `binaries.lock.json`, applied to the versions that are
 * fetched on demand rather than bundled: without it the only thing standing
 * between the user and a substituted binary is TLS to whichever mirror the
 * preferences point at. Pinning here means the download can be checked against
 * a digest whose provenance was established once, at generation time, against
 * the canonical host.
 *
 * Unlike the lock, entries are never regenerated. A pin that exists is a pin
 * that was verified, so the generator only ever adds.
 */

const PinnedKubectl = z.object({
  url: z.url(),
  sha256: z.string().regex(/^[0-9a-f]{64}$/, "must be a lowercase hex SHA-256 digest"),
});

/** Keyed by kubectl version, then by `${platform}/${arch}`. */
export const KubectlChecksums = z.record(
  z.string().regex(/^\d+\.\d+\.\d+$/, "must be a bare semantic version, without a leading v"),
  z.record(z.string(), PinnedKubectl),
);

export type KubectlChecksums = z.infer<typeof KubectlChecksums>;

/** Orders `1.9.11` before `1.22.17`, which a plain string sort would not. */
function compareVersions(left: string, right: string): number {
  const leftParts = left.split(".").map(Number);
  const rightParts = right.split(".").map(Number);

  for (let index = 0; index < 3; index += 1) {
    const difference = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);

    if (difference !== 0) {
      return difference;
    }
  }

  return 0;
}

/**
 * Reads the pins, treating a missing file as an empty table so that the
 * generator can create it on a first run.
 */
export async function readKubectlChecksums(pathToChecksums: string): Promise<KubectlChecksums> {
  let raw: string;

  try {
    raw = await readFile(pathToChecksums, "utf-8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return {};
    }

    throw new Error(`unable to read the kubectl checksums at ${pathToChecksums}: ${error}`);
  }

  return KubectlChecksums.parse(JSON.parse(raw));
}

/**
 * Writes the pins with versions in release order, variants in the same order
 * the lock file uses, and a trailing newline. Stable output is what lets CI
 * regenerate the file and treat any diff at all as a finding.
 */
export async function writeKubectlChecksums(pathToChecksums: string, checksums: KubectlChecksums): Promise<void> {
  const variants = supportedPlatforms.flatMap((platform) =>
    supportedArches.map((arch) => artifactKey({ platform, arch })),
  );

  const ordered = Object.fromEntries(
    Object.keys(checksums)
      .sort(compareVersions)
      .map((version) => {
        const pinned = checksums[version] ?? {};
        const unknown = Object.keys(pinned).filter((key) => !variants.includes(key));

        if (unknown.length > 0) {
          throw new Error(`refusing to write kubectl ${version} with unsupported variant(s): ${unknown.join(", ")}`);
        }

        return [
          version,
          Object.fromEntries(
            variants
              .filter((key) => pinned[key])
              .map((key) => [key, { url: pinned[key]?.url, sha256: pinned[key]?.sha256 }]),
          ),
        ];
      }),
  );

  await writeFile(pathToChecksums, `${JSON.stringify(ordered, null, 2)}\n`);
}
