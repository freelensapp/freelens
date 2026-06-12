/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import { sortBy } from "lodash/fp";
import downloadJsonViaChannelInjectable from "../../../../../../../renderer/fetch/download-json-via-channel-copy.injectable";

import type { HelmRepo } from "../../../../../../../common/helm/helm-repo";

const artifactsHubSearchUrl = "https://hub.helm.sh/api/chartsvc/v1/charts/search?q=";

interface ArtifactsHubSearchResponse {
  data: ArtifactsHubChartItem[];
}

interface ArtifactsHubChartItem {
  id: string;
  artifactHub: {
    packageUrl: string;
  };
  attributes: {
    description: string;
    repo: {
      name: string;
      url: string;
    };
    relationships: {
      latestChartVersion: {
        data: {
          version: string;
          appVersion: string;
        };
      };
    };
  };
}

const requestPublicHelmRepositoriesInjectable = getInjectable({
  id: "request-public-helm-repositories",

  instantiate: (di) => {
    const downloadJson = di.inject(downloadJsonViaChannelInjectable);
    const logger = di.inject(loggerInjectionToken);

    return async (): Promise<HelmRepo[]> => {
      const result = await downloadJson(artifactsHubSearchUrl, {
        timeout: 10_000,
      });

      if (!result.callWasSuccessful) {
        logger.warn(`Failed to download public helm repos: ${result.error}`);

        return [];
      }

      const response = result.response as ArtifactsHubSearchResponse;
      const repos = response.data.map((item) => item.attributes.repo);
      const uniqueRepos = Array.from(
        new Map(repos.map((repo) => [repo.name, { ...repo, cacheFilePath: "" }])).values(),
      );

      return sortBy((repo) => repo.name, uniqueRepos);
    };
  },

  causesSideEffects: true,
});

export default requestPublicHelmRepositoriesInjectable;
