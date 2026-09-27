/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { shortDigestLength, shortenDigest } from "./checksums";

export interface ParsedVersionDirectory {
  version: string;
  digest: string;
}

const versionDirectoryPattern = new RegExp(`^(?<version>.+)-(?<digest>[0-9a-f]{${shortDigestLength}})$`);

/**
 * The name of the directory a managed build is extracted into, below
 * `<extensionsRoot>/<sanitized-name>/`.
 *
 * The version alone is not a content identity: URL and local installs have no
 * version discipline, and an author rebuilding the same `0.1.0` tarball is the
 * dominant case. The digest is an identity and cache-busting token, not a
 * verification anchor.
 */
export function versionDirectoryName(version: string, digest: string): string {
  return `${version}-${shortenDigest(digest)}`;
}

/**
 * The inverse of {@link versionDirectoryName}, and the test for whether a
 * directory holds a managed build at all: the absence of a
 * `<version>-<digest>` segment is what marks a development extension.
 *
 * A version may itself contain dashes (`1.0.0-beta.1`), so the digest is taken
 * from the end.
 */
export function parseVersionDirectoryName(name: string): ParsedVersionDirectory | undefined {
  const groups = versionDirectoryPattern.exec(name)?.groups;

  if (!groups?.version || !groups.digest) {
    return undefined;
  }

  return { version: groups.version, digest: groups.digest };
}
