import { getInjectable } from "@ogre-tools/injectable";
import { asyncComputed } from "@ogre-tools/injectable-react";
import { observable } from "mobx";
import {
  logInfoInjectionToken,
  logWarningInjectionToken,
} from "@freelensapp/logger";
import { kubeApiInjectionToken } from "@freelensapp/kube-api-specifics";

interface KubeApiWithId {
  list: (params?: { namespace?: string }) => Promise<any>;
  apiBase?: string;
}

export const podMetricsApiWatcherInjectable = getInjectable({
  id: "pods-metrics-watcher",
  instantiate: (di) => {
    const allApisRaw = di.injectMany(kubeApiInjectionToken);

    const allApis = allApisRaw.map(
      (api) => api as unknown as KubeApiWithId,
    );

    const logInfo = di.inject(logInfoInjectionToken);
    const logWarn = di.inject(logWarningInjectionToken);

    const availableBases = allApis.map((api) => api.apiBase || "unknown");

    logInfo("Available kube API bases:", availableBases);

    const podMetricsApi = allApis.find(
      (api) => api.apiBase === "/apis/metrics.k8s.io/v1beta1/pods",
    );

    if (!podMetricsApi) {
      throw new Error(
        `Pod Metrics API not found. Available API bases: ${availableBases.join(", ")}`,
      );
    }

    return (
      watchedNamespaces: { get: () => string[] | undefined },
      intervalSeconds = 30,
      limit?: <T>(fn: () => Promise<T>) => Promise<T>,
    ) => {
      const ticker = observable.box(Date.now());

      void setInterval(() => {
        ticker.set(Date.now());
      }, intervalSeconds * 1000);

      return asyncComputed({
        valueWhenPending: [],
        betweenUpdates: "show-latest-value",
        getValueFromObservedPromise: async () => {
          ticker.get();
          const namespaces = watchedNamespaces.get();

          try {
            if (!namespaces) {
              return (await podMetricsApi.list()) || [];
            }

            const namespaceResults = await Promise.allSettled(
              namespaces.map((namespace) =>
                limit
                  ? limit(() => podMetricsApi.list({ namespace }))
                  : podMetricsApi.list({ namespace }),
              ),
            );

            return namespaceResults.flatMap((result) =>
              result.status === "fulfilled" ? result.value || [] : [],
            );
          } catch (error) {
            logWarn("[POD-METRICS-API-WATCHER] failed to fetch metrics", { error, namespaces });

            return [];
          }
        },
      });
    };
  },
});
