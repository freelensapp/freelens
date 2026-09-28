/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { readFile, writeFile } from "node:fs/promises";
import z from "zod";
import { type Artifact, artifactKey, supportedArches, supportedPlatforms, toolNames } from "./artifacts.js";

import type { ToolVersions } from "./artifacts.js";

/**
 * The committed lock file pinning the exact bytes of every bundled binary.
 *
 * Without it the checksum would come from the same origin as the artifact,
 * which catches a corrupted download but not a replaced release. Pinning the
 * digests here makes any change to a published artifact show up as a diff that
 * has to be reviewed, and lets the signatures be checked once when the pin is
 * written rather than on every build on every platform.
 */

const LockedArtifact = z.object({
  url: z.url(),
  sha256: z.string().regex(/^[0-9a-f]{64}$/, "must be a lowercase hex SHA-256 digest"),
});

const LockedTool = z.object({
  version: z.string().min(1),
  artifacts: z.record(z.string(), LockedArtifact),
});

export const BinariesLock = z.record(z.enum(toolNames), LockedTool);

export type BinariesLock = z.infer<typeof BinariesLock>;

export async function readLock(pathToLock: string): Promise<BinariesLock> {
  let raw: string;

  try {
    raw = await readFile(pathToLock, "utf-8");
  } catch (error) {
    throw new Error(
      `unable to read the binaries lock file at ${pathToLock}: ${error}. Run \`pnpm update-binaries-lock\` to create it.`,
    );
  }

  return BinariesLock.parse(JSON.parse(raw));
}

/**
 * Writes the lock with sorted keys and a trailing newline, so that regenerating
 * it produces a diff only when something actually changed.
 */
export async function writeLock(pathToLock: string, lock: BinariesLock): Promise<void> {
  const ordered = Object.fromEntries(
    toolNames.map((tool) => {
      const entry = lock[tool];

      if (!entry) {
        throw new Error(`refusing to write a lock file without an entry for ${tool}`);
      }

      const artifacts = supportedPlatforms.flatMap((platform) =>
        supportedArches.map((arch) => artifactKey({ platform, arch })),
      );

      return [
        tool,
        {
          version: entry.version,
          artifacts: Object.fromEntries(
            artifacts.map((key) => {
              const locked = entry.artifacts[key];

              if (!locked) {
                throw new Error(`refusing to write a lock file without ${tool} for ${key}`);
              }

              return [key, { url: locked.url, sha256: locked.sha256 }];
            }),
          ),
        },
      ];
    }),
  );

  await writeFile(pathToLock, `${JSON.stringify(ordered, null, 2)}\n`);
}

/**
 * Returns the pinned digest for an artifact, failing loudly rather than falling
 * back to anything when the lock does not describe it. A missing or stale entry
 * means the lock was not regenerated after a version bump.
 */
export function resolvePinnedChecksum(lock: BinariesLock, artifact: Artifact): string {
  const regenerate = "Run `pnpm update-binaries-lock` to regenerate it.";
  const entry = lock[artifact.tool];

  if (!entry) {
    throw new Error(`the binaries lock file has no entry for ${artifact.tool}. ${regenerate}`);
  }

  if (entry.version !== artifact.version) {
    throw new Error(
      `the binaries lock file pins ${artifact.tool} ${entry.version} but the build wants ${artifact.version}. ${regenerate}`,
    );
  }

  const key = artifactKey(artifact);
  const locked = entry.artifacts[key];

  if (!locked) {
    throw new Error(`the binaries lock file has no ${artifact.tool} entry for ${key}. ${regenerate}`);
  }

  if (locked.url !== artifact.url) {
    throw new Error(
      `the binaries lock file pins a different URL for ${artifact.tool} ${key}: ${locked.url} instead of ${artifact.url}. ${regenerate}`,
    );
  }

  return locked.sha256;
}

/** Checks that the versions a lock pins are the ones the package.json asks for. */
export function assertLockMatchesVersions(lock: BinariesLock, versions: ToolVersions, pathToLock: string): void {
  const stale = toolNames.filter((tool) => lock[tool]?.version !== versions[tool]);

  if (stale.length > 0) {
    const details = stale.map((tool) => `${tool} pins ${lock[tool]?.version ?? "nothing"}, wants ${versions[tool]}`);

    throw new Error(
      `${pathToLock} is out of date: ${details.join("; ")}. Run \`pnpm update-binaries-lock\` to regenerate it.`,
    );
  }
}
