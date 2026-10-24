import rawChecksums from "./build/checksums.json";
import raw from "./build/versions.json";

export const kubectlVersions = raw as [string, string][];

export interface KubectlChecksum {
  /** Canonical dl.k8s.io URL the digest was established from. */
  url: string;
  sha256: string;
}

/** Pinned digests keyed by kubectl version, then by `${platform}/${arch}`. */
export type KubectlChecksums = Record<string, Record<string, KubectlChecksum>>;

/**
 * Verified digests for every kubectl the application may download at runtime.
 *
 * Not every version has all six variants - v1.22.17 has no windows/arm64 - so a
 * missing key means upstream never published that build, not that the table is
 * incomplete.
 */
export const kubectlChecksums = rawChecksums as KubectlChecksums;
