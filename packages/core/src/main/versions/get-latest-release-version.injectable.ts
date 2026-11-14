/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { branding } from "../../common/branding";
import downloadJsonInjectable from "../fetch/download-json.injectable";

interface GitHubRelease {
  tag_name?: unknown;
  draft?: unknown;
  prerelease?: unknown;
}

const versionPattern = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;

/**
 * The version of the latest published ProLens release: the tag of the
 * repository's "latest" GitHub release, without a leading "v". GitHub never
 * marks a draft or a prerelease as latest.
 */
const getLatestReleaseVersionInjectable = getInjectable({
  id: "get-latest-release-version",
  instantiate: (di) => {
    const downloadJson = di.inject(downloadJsonInjectable);

    return async (repository: string = branding.releasesRepository): Promise<string> => {
      const result = await downloadJson(`https://api.github.com/repos/${repository}/releases/latest`, {
        timeout: 5000,
      });

      if (!result.callWasSuccessful) {
        throw new Error(`Failed to fetch latest release: ${result.error}`);
      }

      const release = (await result.response) as GitHubRelease;
      const tag = typeof release?.tag_name === "string" ? release.tag_name.trim().replace(/^v/i, "") : undefined;

      if (!tag || !versionPattern.test(tag)) {
        throw new Error("Invalid response from GitHub releases");
      }

      return tag;
    };
  },
});

export default getLatestReleaseVersionInjectable;
