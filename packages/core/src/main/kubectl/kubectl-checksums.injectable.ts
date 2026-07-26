/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { kubectlChecksums } from "@freelensapp/kubectl-versions";
import { getInjectable } from "@ogre-tools/injectable";

import type { KubectlChecksum } from "@freelensapp/kubectl-versions";

import type { NormalizedPlatform } from "../../common/vars/normalized-platform.injectable";

export interface KubectlChecksumQuery {
  version: string;
  platform: NormalizedPlatform;
  /** Architecture as the download URLs name it, which is not how Node does. */
  arch: "amd64" | "arm64" | "386";
}

/**
 * Looks up the pinned digest of a kubectl download.
 *
 * Returns `undefined` when the application must not download that kubectl:
 * either the version is outside the pinned range, or upstream never published
 * that platform/architecture (v1.22.17 has no windows/arm64). Both are the same
 * answer to the caller -- there is nothing to verify the bytes against.
 */
export type GetKubectlChecksum = (query: KubectlChecksumQuery) => KubectlChecksum | undefined;

/**
 * The pin table is keyed by architecture as Node names it, matching
 * `binaries.lock.json`, while the download URL uses the Kubernetes spelling.
 * `386` is deliberately absent: only x64 and arm64 are built, so it is
 * unreachable in a shipped build and nothing was pinned for it.
 */
const toPinnedArch = (arch: KubectlChecksumQuery["arch"]): string | undefined =>
  arch === "amd64" ? "x64" : arch === "arm64" ? "arm64" : undefined;

const kubectlChecksumsInjectable = getInjectable({
  id: "kubectl-checksums",

  instantiate: (): GetKubectlChecksum => {
    return ({ version, platform, arch }) => {
      const pinnedArch = toPinnedArch(arch);

      if (!pinnedArch) {
        return undefined;
      }

      return kubectlChecksums[version]?.[`${platform}/${pinnedArch}`];
    };
  },
});

export default kubectlChecksumsInjectable;
