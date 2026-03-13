/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";

import type { ListedHelmRelease } from "../common/channels";

export interface HelmReleaseCacheEntry {
  data: ListedHelmRelease[];
  timestamp: number;
}

export interface HelmReleaseCache {
  get: (clusterId: string, namespace?: string) => ListedHelmRelease[] | undefined;
  set: (clusterId: string, namespace: string | undefined, data: ListedHelmRelease[]) => void;
  invalidate: (clusterId: string, namespace?: string) => void;
  invalidateCluster: (clusterId: string) => void;
  clear: () => void;
}

const cacheTimeToLiveInMilliseconds = 30_000;

const getCacheKey = (clusterId: string, namespace?: string) => `${clusterId}:${namespace ?? "all"}`;

const isExpired = (entry: HelmReleaseCacheEntry) => Date.now() - entry.timestamp > cacheTimeToLiveInMilliseconds;

const helmReleaseCacheInjectable = getInjectable({
  id: "helm-release-cache",

  instantiate: (): HelmReleaseCache => {
    const cache = new Map<string, HelmReleaseCacheEntry>();

    return {
      get: (clusterId, namespace) => {
        const key = getCacheKey(clusterId, namespace);
        const cacheEntry = cache.get(key);

        if (!cacheEntry) {
          return undefined;
        }

        if (isExpired(cacheEntry)) {
          cache.delete(key);

          return undefined;
        }

        return cacheEntry.data;
      },

      set: (clusterId, namespace, data) => {
        cache.set(getCacheKey(clusterId, namespace), {
          data,
          timestamp: Date.now(),
        });
      },

      invalidate: (clusterId, namespace) => {
        cache.delete(getCacheKey(clusterId, namespace));
      },

      invalidateCluster: (clusterId) => {
        const clusterPrefix = `${clusterId}:`;

        for (const key of cache.keys()) {
          if (key.startsWith(clusterPrefix)) {
            cache.delete(key);
          }
        }
      },

      clear: () => {
        cache.clear();
      },
    };
  },
});

export default helmReleaseCacheInjectable;
