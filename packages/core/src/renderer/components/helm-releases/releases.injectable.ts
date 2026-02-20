/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { prefixedLoggerInjectable } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import { asyncComputed } from "@ogre-tools/injectable-react";
import assert from "assert";
import { action, computed, observable, runInAction } from "mobx";
import requestListHelmReleasesInjectable from "../../../features/helm-releases/renderer/request-list-helm-releases.injectable";
import clusterFrameContextForNamespacedResourcesInjectable from "../../cluster-frame-context/for-namespaced-resources.injectable";
import hostedClusterIdInjectable from "../../cluster-frame-context/hosted-cluster-id.injectable";
import releaseSecretsInjectable from "./release-secrets.injectable";
import { toHelmRelease } from "./to-helm-release";

import type { IAsyncComputed } from "@ogre-tools/injectable-react";
import type { IComputedValue, IObservableValue } from "mobx";

import type { HelmRelease } from "../../../common/k8s-api/endpoints/helm-releases.api";
import type {
  ListedHelmRelease,
  ListHelmReleasesArgs,
  ListHelmReleasesResponse,
} from "../../../features/helm-releases/common/channels";

interface RefreshingAsyncComputed<T> extends IAsyncComputed<T> {
  isRefreshing: IComputedValue<boolean>;
  lastUpdatedAt: IObservableValue<number | undefined>;
}

type InflightRequests = Map<string, Promise<ListHelmReleasesResponse>>;

const getRequestKey = ({ clusterId, namespace }: ListHelmReleasesArgs) => `${clusterId}:${namespace ?? "all"}`;

const toReleases = (
  releaseResults: ListHelmReleasesResponse[],
  logger: { warn: (message: string, details: object) => void },
): HelmRelease[] => {
  const listedReleases: ListedHelmRelease[] = [];

  for (const result of releaseResults) {
    if (result.callWasSuccessful) {
      listedReleases.push(...result.response.releases);
    } else {
      logger.warn("Failed to list helm releases", { error: result.error });
    }
  }

  return listedReleases.map(toHelmRelease);
};

const hasAnySuccessfulResult = (releaseResults: ListHelmReleasesResponse[]) =>
  releaseResults.some((result) => result.callWasSuccessful);

const hasCachedResult = (releaseResults: ListHelmReleasesResponse[]) =>
  releaseResults.some((result) => result.callWasSuccessful && result.response.fromCache);

const requestReleasesForContext = async ({
  clusterId,
  hasSelectedAll,
  contextNamespaces,
  requestListHelmReleases,
  inflightRequests,
  skipCache,
}: {
  clusterId: string;
  hasSelectedAll: boolean;
  contextNamespaces: string[];
  requestListHelmReleases: (args: ListHelmReleasesArgs) => Promise<ListHelmReleasesResponse>;
  inflightRequests: InflightRequests;
  skipCache: boolean;
}): Promise<ListHelmReleasesResponse[]> => {
  const requestArgs: ListHelmReleasesArgs[] = hasSelectedAll
    ? [{ clusterId, skipCache }]
    : contextNamespaces.map((namespace) => ({
        clusterId,
        namespace,
        skipCache,
      }));

  const requestPromises = requestArgs.map((args) => {
    const key = getRequestKey(args);
    const existingRequest = inflightRequests.get(key);

    if (existingRequest) {
      return existingRequest;
    }

    const requestPromise = requestListHelmReleases(args).finally(() => {
      runInAction(() => {
        inflightRequests.delete(key);
      });
    });

    runInAction(() => {
      inflightRequests.set(key, requestPromise);
    });

    return requestPromise;
  });

  return Promise.all(requestPromises);
};

const releasesInjectable = getInjectable({
  id: "releases",

  instantiate: (di) => {
    const clusterContext = di.inject(clusterFrameContextForNamespacedResourcesInjectable);
    const hostedClusterId = di.inject(hostedClusterIdInjectable);
    const releaseSecrets = di.inject(releaseSecretsInjectable);
    const requestListHelmReleases = di.inject(requestListHelmReleasesInjectable);
    const logger = di.inject(prefixedLoggerInjectable, "HELM-RELEASES");

    assert(hostedClusterId, "hostedClusterId is required");

    const inflightRequests: InflightRequests = observable.map();
    const isRefreshing = observable.box(false);
    const shouldRefreshFromCache = observable.box(false);
    const shouldSkipCacheOnNextFetch = observable.box(false);
    const lastUpdatedAt = observable.box<number>();
    const latestSuccessfulReleases = observable.box<HelmRelease[]>([]);

    const releases = asyncComputed({
      getValueFromObservedPromise: async () => {
        void releaseSecrets.get();

        const skipCache = shouldSkipCacheOnNextFetch.get();

        runInAction(() => {
          shouldSkipCacheOnNextFetch.set(false);
        });

        const releaseResults = await requestReleasesForContext({
          clusterId: hostedClusterId,
          hasSelectedAll: clusterContext.hasSelectedAll,
          contextNamespaces: [...clusterContext.contextNamespaces],
          requestListHelmReleases,
          inflightRequests,
          skipCache,
        });

        const nextReleases = toReleases(releaseResults, logger);
        const releaseListingWasSuccessful = hasAnySuccessfulResult(releaseResults);

        runInAction(() => {
          if (releaseListingWasSuccessful) {
            latestSuccessfulReleases.set(nextReleases);
            lastUpdatedAt.set(Date.now());

            if (!skipCache && hasCachedResult(releaseResults)) {
              shouldRefreshFromCache.set(true);
            }
          }

          if (skipCache) {
            isRefreshing.set(false);
          }
        });

        if (releaseListingWasSuccessful) {
          return nextReleases;
        }

        return latestSuccessfulReleases.get();
      },
      valueWhenPending: [],
      betweenUpdates: "show-latest-value",
    });

    const triggerBackgroundRefresh = action(() => {
      if (releases.pending.get() || isRefreshing.get() || !shouldRefreshFromCache.get()) {
        return;
      }

      shouldRefreshFromCache.set(false);
      shouldSkipCacheOnNextFetch.set(true);
      isRefreshing.set(true);

      releases.invalidate();
    });

    const value = computed(() => {
      const loadedReleases = releases.value.get();

      triggerBackgroundRefresh();

      return loadedReleases;
    });

    return {
      ...releases,
      value,
      isRefreshing: computed(() => isRefreshing.get()),
      lastUpdatedAt,
      invalidate: action(() => {
        isRefreshing.set(false);
        shouldRefreshFromCache.set(false);
        shouldSkipCacheOnNextFetch.set(false);
        releases.invalidate();
      }),
    } as RefreshingAsyncComputed<HelmRelease[]>;
  },
});

export default releasesInjectable;
