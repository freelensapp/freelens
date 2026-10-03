/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { noop, WrappedAbortController } from "@freelensapp/utilities";
import { observable, runInAction } from "mobx";
import { KubeWatchApi } from "./kube-watch-api";

import type { Logger } from "@freelensapp/logger";

import type {
  KubeObjectStoreLoadAllParams,
  KubeObjectStoreSubscribeParams,
} from "../../common/k8s-api/kube-object.store";
import type { SubscribableStore } from "./kube-watch-api";

const logger: Logger = {
  debug: noop,
  error: noop,
  info: noop,
  silly: noop,
  warn: noop,
};

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * A store whose lists stay pending until `finishLoads()`, and resolve on an
 * abort like `KubeObjectStore.loadAll` does. Its watches are wrapped the way
 * `KubeApi.watch` wraps the controller it is given.
 */
const createStore = ({ isNamespaced = false } = {}) => {
  const pendingLoads: Array<() => void> = [];
  const watchSignals: AbortSignal[] = [];

  const store = {
    api: {
      isNamespaced,
      apiBase: "/api/v1/foos",
      kind: "Foo",
    },
    loadAll: vi.fn(
      ({ reqInit }: KubeObjectStoreLoadAllParams = {}) =>
        new Promise<undefined>((resolve) => {
          pendingLoads.push(() => resolve(undefined));
          reqInit?.signal?.addEventListener("abort", () => resolve(undefined));
        }),
    ),
    subscribe: vi.fn(({ abortController }: KubeObjectStoreSubscribeParams = {}) => {
      const watchController = new WrappedAbortController(abortController);

      watchSignals.push(watchController.signal);

      return () => watchController.abort();
    }),
  } satisfies SubscribableStore;

  return {
    store,
    finishLoads: async () => {
      for (const finish of pendingLoads.splice(0)) {
        finish();
      }

      await flushPromises();
    },
    openWatches: () => watchSignals.filter((signal) => !signal.aborted).length,
  };
};

const createKubeWatchApi = () => {
  const clusterContext = observable({
    allNamespaces: ["default", "kube-system"],
    contextNamespaces: ["default"],
    hasSelectedAll: false,
    isLoadingAll: () => false,
    isGlobalWatchEnabled: () => false,
  });

  return {
    clusterContext,
    kubeWatchApi: new KubeWatchApi({ clusterContext, logger }),
  };
};

describe("KubeWatchApi", () => {
  it("aborts the watch of a store when the subscription is disposed", async () => {
    const { kubeWatchApi } = createKubeWatchApi();
    const { store, finishLoads, openWatches } = createStore();

    const unsubscribe = kubeWatchApi.subscribeStores([store]);

    await finishLoads();

    expect(openWatches()).toBe(1);

    unsubscribe();

    expect(openWatches()).toBe(0);
  });

  it("does not watch a store whose subscription was disposed while its list was loading", async () => {
    const { kubeWatchApi } = createKubeWatchApi();
    const { store, finishLoads, openWatches } = createStore();

    const unsubscribe = kubeWatchApi.subscribeStores([store]);

    unsubscribe();
    await finishLoads();

    expect(store.subscribe).not.toHaveBeenCalled();
    expect(openWatches()).toBe(0);
  });

  it("leaves one watch open after a mount, an unmount and a remount, and none after the last unmount", async () => {
    const { kubeWatchApi } = createKubeWatchApi();
    const { store, finishLoads, openWatches } = createStore();

    // what React.StrictMode does to every view in development
    const unsubscribeFirst = kubeWatchApi.subscribeStores([store]);

    unsubscribeFirst();

    const unsubscribeSecond = kubeWatchApi.subscribeStores([store]);

    await finishLoads();

    expect(store.subscribe).toHaveBeenCalledTimes(1);
    expect(openWatches()).toBe(1);

    unsubscribeSecond();

    expect(openWatches()).toBe(0);
  });

  it("leaves one watch open after the namespaces change while the list is loading, and none after disposal", async () => {
    const { kubeWatchApi, clusterContext } = createKubeWatchApi();
    const { store, finishLoads, openWatches } = createStore({ isNamespaced: true });

    const unsubscribe = kubeWatchApi.subscribeStores([store]);

    runInAction(() => {
      clusterContext.contextNamespaces = ["kube-system"];
    });
    await finishLoads();

    expect(store.loadAll).toHaveBeenCalledTimes(2);
    expect(store.subscribe).toHaveBeenCalledTimes(1);
    expect(openWatches()).toBe(1);

    unsubscribe();

    expect(openWatches()).toBe(0);
  });

  it("aborts the restarted watch when the namespaces change after the list loaded", async () => {
    const { kubeWatchApi, clusterContext } = createKubeWatchApi();
    const { store, finishLoads, openWatches } = createStore({ isNamespaced: true });

    const unsubscribe = kubeWatchApi.subscribeStores([store]);

    await finishLoads();

    runInAction(() => {
      clusterContext.contextNamespaces = ["kube-system"];
    });

    expect(openWatches()).toBe(0);

    await finishLoads();

    expect(store.subscribe).toHaveBeenCalledTimes(2);
    expect(openWatches()).toBe(1);

    unsubscribe();

    expect(openWatches()).toBe(0);
  });
});
