/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { Logger } from "@freelensapp/logger";
import type { Disposer } from "@freelensapp/utilities";
import { WrappedAbortController, disposer, getOrInsert, noop } from "@freelensapp/utilities";
import { once } from "lodash";
import { comparer, reaction } from "mobx";
import type {
  KubeObjectStoreLoadAllParams,
  KubeObjectStoreSubscribeParams,
} from "../../common/k8s-api/kube-object.store";
import type { ClusterContext } from "../cluster-frame-context/cluster-frame-context";

// Kubernetes watch-api client
// API: https://developer.mozilla.org/en-US/docs/Web/API/Streams_API/Using_readable_streams

interface SubscribeStoreParams {
  store: SubscribableStore;
  parent: AbortController;
  namespaces: string[] | undefined;
  onLoadFailure?: (err: any) => void;
}

interface WatchCountDependencies {
  readonly logger: Logger;
}

class WatchCount {
  readonly #data = new Map<SubscribableStore, number>();

  constructor(private readonly dependencies: WatchCountDependencies) {}

  public inc(store: SubscribableStore): number {
    const newCount = getOrInsert(this.#data, store, 0) + 1;

    this.dependencies.logger.info(`[KUBE-WATCH-API]: inc() count for ${store.api.apiBase} is now ${newCount}`);
    this.#data.set(store, newCount);

    return newCount;
  }

  public dec(store: SubscribableStore): number {
    const oldCount = this.#data.get(store);

    if (oldCount === undefined) {
      throw new Error(`Cannot dec count for store that has never been inc: ${store.api.kind}`);
    }

    const newCount = oldCount - 1;

    if (newCount < 0) {
      throw new Error(`Cannot dec count more times than it has been inc: ${store.api.kind}`);
    }

    this.dependencies.logger.info(`[KUBE-WATCH-API]: dec() count for ${store.api.apiBase} is now ${newCount}`);
    this.#data.set(store, newCount);

    return newCount;
  }
}

export interface KubeWatchSubscribeStoreOptions {
  /**
   * The namespaces to watch
   * @default all selected namespaces
   */
  namespaces?: string[];

  /**
   * A function that is called when listing fails. If set then blocks errors
   * from rejecting promises
   */
  onLoadFailure?: (err: any) => void;
}

interface Dependencies {
  readonly clusterContext: ClusterContext;
  readonly logger: Logger;
}

export interface SubscribableStore {
  readonly api: {
    readonly isNamespaced: boolean;
    readonly apiBase: string;
    readonly kind: string;
    readonly apiVersionWithGroup?: string;
  };
  loadAll(opts?: KubeObjectStoreLoadAllParams): Promise<unknown>;
  subscribe(opts?: KubeObjectStoreSubscribeParams): Disposer;
}

export type SubscribeStores = (stores: SubscribableStore[], opts?: KubeWatchSubscribeStoreOptions) => Disposer;

export class KubeWatchApi {
  readonly #watch: WatchCount;

  constructor(private readonly dependencies: Dependencies) {
    this.#watch = new WatchCount(this.dependencies);
  }

  private subscribeStore({ store, parent, namespaces, onLoadFailure }: SubscribeStoreParams): Disposer {
    const isNamespaceFilterWatch = !namespaces;

    if (isNamespaceFilterWatch && this.#watch.inc(store) > 1) {
      // don't load or subscribe to a store more than once
      return () => this.#watch.dec(store);
    }

    namespaces ??= this.dependencies.clusterContext.contextNamespaces ?? [];

    let childController = new WrappedAbortController(parent);
    const unsubscribe = disposer();

    const loadThenSubscribe = async (namespaces: string[] | undefined) => {
      try {
        await store.loadAll({ namespaces, reqInit: { signal: childController.signal }, onLoadFailure });
        unsubscribe.push(store.subscribe({ onLoadFailure, abortController: childController }));
      } catch (error) {
        if (!(error instanceof DOMException)) {
          this.log(new Error("Loading stores has failed", { cause: error }), {
            meta: { store, namespaces },
          });
        }
      }
    };

    /**
     * We don't want to wait because we want to start reacting to namespace
     * selection changes ASAP
     */
    loadThenSubscribe(namespaces).catch(noop);

    const cancelReloading =
      isNamespaceFilterWatch && store.api.isNamespaced
        ? reaction(
            // Note: must slice because reaction won't fire if it isn't there
            () =>
              [
                this.dependencies.clusterContext.contextNamespaces.slice(),
                this.dependencies.clusterContext.hasSelectedAll,
              ] as const,
            ([namespaces, curSelectedAll], [prevNamespaces, prevSelectedAll]) => {
              if (curSelectedAll && prevSelectedAll) {
                const action = namespaces.length > prevNamespaces.length ? "created" : "deleted";

                return console.debug(
                  `[KUBE-WATCH-API]: Not changing watch for ${store.api.apiBase} because a new namespace was ${action} but all namespaces are selected`,
                );
              }

              console.log(`[KUBE-WATCH-API]: changing watch ${store.api.apiBase}`, namespaces);
              childController.abort();
              unsubscribe();
              childController = new WrappedAbortController(parent);
              loadThenSubscribe(namespaces).catch(noop);
            },
            {
              equals: comparer.shallow,
            },
          )
        : noop; // don't watch namespaces if namespaces were provided

    return () => {
      if (isNamespaceFilterWatch && this.#watch.dec(store) === 0) {
        // only stop the subcribe if this is the last one
        cancelReloading();
        childController.abort();
        unsubscribe();
      }
    };
  }

  subscribeStores: SubscribeStores = (stores, { namespaces, onLoadFailure } = {}) => {
    const parent = new AbortController();
    const unsubscribe = disposer(
      ...stores.map((store) =>
        this.subscribeStore({
          store,
          parent,
          namespaces,
          onLoadFailure,
        }),
      ),
    );

    // unsubscribe
    return once(() => {
      parent.abort();
      unsubscribe();
    });
  };

  protected log(message: any, meta: any) {
    const log = message instanceof Error ? this.dependencies.logger.error : this.dependencies.logger.debug;

    log("[KUBE-WATCH-API]:", message, {
      time: new Date().toLocaleString(),
      ...meta,
    });
  }
}
