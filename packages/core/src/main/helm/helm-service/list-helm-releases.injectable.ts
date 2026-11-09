/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import requestStoredHelmReleasesInjectable from "../request-stored-helm-releases.injectable";

import type { AsyncResult } from "@freelensapp/utilities";

import type { Cluster } from "../../../common/cluster/cluster";
import type { ListedHelmRelease } from "../../../features/helm-releases/common/channels";

export type ListClusterHelmReleases = (
  cluster: Cluster,
  namespace?: string,
) => AsyncResult<ListedHelmRelease[], string>;

const listClusterHelmReleasesInjectable = getInjectable({
  id: "list-cluster-helm-releases",

  instantiate: (di): ListClusterHelmReleases => {
    const logger = di.inject(loggerInjectionToken);
    const requestStoredHelmReleases = di.inject(requestStoredHelmReleasesInjectable);

    return async (cluster, namespace) => {
      logger.debug(`[CLUSTER]: listing helm releases for clusterId=${cluster.id}`, { namespace });

      try {
        const releases = await requestStoredHelmReleases(cluster, namespace);

        return {
          callWasSuccessful: true,
          response: releases.map(({ name, namespace, version, info, chart }) => ({
            name,
            namespace,
            revision: String(version),
            updated: info.last_deployed,
            status: info.status,
            chart: `${chart.metadata.name}-${chart.metadata.version}`,
            app_version: chart.metadata.appVersion ?? "",
          })),
        };
      } catch (error) {
        return {
          callWasSuccessful: false,
          error: `Failed to list helm releases: ${error}`,
        };
      }
    };
  },
});

export default listClusterHelmReleasesInjectable;
