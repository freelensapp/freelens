/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getRequestChannelListenerInjectable } from "@freelensapp/messaging";
import listClusterHelmReleasesInjectable from "../../../main/helm/helm-service/list-helm-releases.injectable";
import getClusterByIdInjectable from "../../cluster/storage/common/get-by-id.injectable";
import { listHelmReleasesChannel } from "../common/channels";
import helmReleaseCacheInjectable from "./helm-release-cache.injectable";

const handleListHelmReleasesInjectable = getRequestChannelListenerInjectable({
  channel: listHelmReleasesChannel,
  id: "handle-list-helm-releases",
  getHandler: (di) => {
    const listClusterHelmReleases = di.inject(listClusterHelmReleasesInjectable);
    const getClusterById = di.inject(getClusterByIdInjectable);
    const helmReleaseCache = di.inject(helmReleaseCacheInjectable);

    return async ({ clusterId, namespace }) => {
      const cluster = getClusterById(clusterId);

      if (!cluster) {
        return {
          callWasSuccessful: false,
          error: `Cluster with id "${clusterId}" not found`,
        };
      }

      const cachedHelmReleases = helmReleaseCache.get(clusterId, namespace);

      if (cachedHelmReleases) {
        return {
          callWasSuccessful: true,
          response: cachedHelmReleases,
        };
      }

      const result = await listClusterHelmReleases(cluster, namespace);

      if (result.callWasSuccessful) {
        helmReleaseCache.set(clusterId, namespace, result.response);
      }

      return result;
    };
  },
});

export default handleListHelmReleasesInjectable;
