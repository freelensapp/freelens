/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { KubeObject } from "@freelensapp/kube-object";
import { noop, WrappedAbortController } from "@freelensapp/utilities";
import { observe } from "mobx";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { KubeObjectStore } from "../kube-object.store";

import type { FetchRequestInit as RequestInit } from "@freelensapp/json-api";
import type { KubeApi, KubeApiWatchOptions } from "@freelensapp/kube-api";
import type { KubeJsonApiDataFor } from "@freelensapp/kube-object";

import type { KubeObjectStoreLoadingParams, KubeObjectStoreOptions } from "../kube-object.store";

class FakeKubeObjectStore extends KubeObjectStore<KubeObject> {
  constructor(
    private readonly _loadItems: (params: KubeObjectStoreLoadingParams) => KubeObject[],
    api: Partial<KubeApi<KubeObject>>,
    opts?: KubeObjectStoreOptions,
  ) {
    super(
      {
        context: {
          allNamespaces: [],
          contextNamespaces: [],
          hasSelectedAll: false,
          isGlobalWatchEnabled: () => true,
          isLoadingAll: () => true,
        },
        logger: {
          debug: noop,
          error: noop,
          info: noop,
          silly: noop,
          warn: noop,
        },
      },
      api as KubeApi<KubeObject>,
      opts,
    );
  }

  async loadItems(params: KubeObjectStoreLoadingParams) {
    return Promise.resolve(this._loadItems(params));
  }
}

// Unlike FakeKubeObjectStore above, this exercises the real `loadItems()` --
// the method that owns the `onLoadFailure` branches -- against a fake
// `api.list()`, instead of bypassing it entirely.
class RealLoadItemsKubeObjectStore extends KubeObjectStore<KubeObject> {
  constructor(api: Partial<KubeApi<KubeObject>>, isLoadingAll: (namespaces: string[]) => boolean = () => true) {
    super(
      {
        context: {
          allNamespaces: [],
          contextNamespaces: [],
          hasSelectedAll: false,
          isGlobalWatchEnabled: () => true,
          isLoadingAll,
        },
        logger: {
          debug: noop,
          error: noop,
          info: noop,
          silly: noop,
          warn: noop,
        },
      },
      api as KubeApi<KubeObject>,
    );
  }
}

describe("KubeObjectStore", () => {
  it("should remove an object from the list of items after it is not returned from listing the same namespace again", async () => {
    const loadItems = vi.fn();
    const obj = new KubeObject({
      apiVersion: "v1",
      kind: "Foo",
      metadata: {
        name: "some-obj-name",
        resourceVersion: "1",
        uid: "some-uid",
        namespace: "default",
        selfLink: "/some/self/link",
      },
    });
    const store = new FakeKubeObjectStore(loadItems, {
      isNamespaced: true,
    });

    loadItems.mockImplementationOnce(() => [obj]);

    await store.loadAll({
      namespaces: ["default"],
    });

    expect(store.items).toContain(obj);

    loadItems.mockImplementationOnce(() => []);

    await store.loadAll({
      namespaces: ["default"],
    });

    expect(store.items).not.toContain(obj);
  });

  it("should not remove an object that is not returned, if it is in a different namespace", async () => {
    const loadItems = vi.fn();
    const objInDefaultNamespace = new KubeObject({
      apiVersion: "v1",
      kind: "Foo",
      metadata: {
        name: "some-obj-name",
        resourceVersion: "1",
        uid: "some-uid",
        namespace: "default",
        selfLink: "/some/self/link",
      },
    });
    const objNotInDefaultNamespace = new KubeObject({
      apiVersion: "v1",
      kind: "Foo",
      metadata: {
        name: "some-obj-name",
        resourceVersion: "1",
        uid: "some-uid",
        namespace: "not-default",
        selfLink: "/some/self/link",
      },
    });
    const store = new FakeKubeObjectStore(loadItems, {
      isNamespaced: true,
    });

    loadItems.mockImplementationOnce(() => [objInDefaultNamespace]);

    await store.loadAll({
      namespaces: ["default"],
    });

    expect(store.items).toContain(objInDefaultNamespace);

    loadItems.mockImplementationOnce(() => [objNotInDefaultNamespace]);

    await store.loadAll({
      namespaces: ["not-default"],
    });

    expect(store.items).toContain(objInDefaultNamespace);
  });

  it("should remove all objects not returned if the api is cluster-scoped", async () => {
    const loadItems = vi.fn();
    const clusterScopedObject1 = new KubeObject({
      apiVersion: "v1",
      kind: "Foo",
      metadata: {
        name: "some-obj-name",
        resourceVersion: "1",
        uid: "some-uid",
        selfLink: "/some/self/link",
      },
    });
    const clusterScopedObject2 = new KubeObject({
      apiVersion: "v1",
      kind: "Foo",
      metadata: {
        name: "some-obj-name",
        resourceVersion: "1",
        uid: "some-uid",
        namespace: "not-default",
        selfLink: "/some/self/link",
      },
    });
    const store = new FakeKubeObjectStore(loadItems, {
      isNamespaced: false,
    });

    loadItems.mockImplementationOnce(() => [clusterScopedObject1]);

    await store.loadAll({});

    expect(store.items).toContain(clusterScopedObject1);

    loadItems.mockImplementationOnce(() => [clusterScopedObject2]);

    await store.loadAll({});

    expect(store.items).not.toContain(clusterScopedObject1);
  });

  it("should not treat an aborted load as a failed load", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(noop);
    const loadItems = vi.fn();
    const obj = new KubeObject({
      apiVersion: "v1",
      kind: "Foo",
      metadata: {
        name: "some-obj-name",
        resourceVersion: "1",
        uid: "some-uid",
        selfLink: "/some/self/link",
      },
    });
    const store = new FakeKubeObjectStore(loadItems, {
      isNamespaced: false,
    });

    loadItems.mockImplementationOnce(() => [obj]);

    await store.loadAll({});

    expect(store.items).toContain(obj);

    loadItems.mockImplementationOnce(() => {
      throw new DOMException("The operation was aborted.", "AbortError");
    });

    const result = await store.loadAll({});

    expect(result).toBeUndefined();
    // the freshly loaded items and the loading flags must be left untouched
    expect(store.items).toContain(obj);
    expect(store.failedLoading).toBe(false);
    expect(warnSpy).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it("should not treat a load with an already-aborted signal as a failed load", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(noop);
    const loadItems = vi.fn();
    const obj = new KubeObject({
      apiVersion: "v1",
      kind: "Foo",
      metadata: {
        name: "some-obj-name",
        resourceVersion: "1",
        uid: "some-uid",
        selfLink: "/some/self/link",
      },
    });
    const store = new FakeKubeObjectStore(loadItems, {
      isNamespaced: false,
    });

    loadItems.mockImplementationOnce(() => [obj]);

    await store.loadAll({});

    expect(store.items).toContain(obj);

    const controller = new AbortController();

    controller.abort();

    loadItems.mockImplementationOnce(() => {
      throw new Error("boom");
    });

    const result = await store.loadAll({
      reqInit: { signal: controller.signal } as RequestInit,
    });

    expect(result).toBeUndefined();
    expect(store.items).toContain(obj);
    expect(store.failedLoading).toBe(false);
    expect(warnSpy).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it("should treat a genuine load failure as a failed load", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(noop);
    const loadItems = vi.fn();
    const obj = new KubeObject({
      apiVersion: "v1",
      kind: "Foo",
      metadata: {
        name: "some-obj-name",
        resourceVersion: "1",
        uid: "some-uid",
        selfLink: "/some/self/link",
      },
    });
    const store = new FakeKubeObjectStore(loadItems, {
      isNamespaced: false,
    });

    loadItems.mockImplementationOnce(() => [obj]);

    await store.loadAll({});

    expect(store.items).toContain(obj);

    loadItems.mockImplementationOnce(() => {
      throw new Error("boom");
    });

    const result = await store.loadAll({});

    expect(result).toBeUndefined();
    // a real failure still resets the store and flags the failure
    expect(store.items).not.toContain(obj);
    expect(store.failedLoading).toBe(true);
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it("does not report an aborted cluster-scoped/all-namespaces load through onLoadFailure", async () => {
    const onLoadFailure = vi.fn();
    const obj = new KubeObject({
      apiVersion: "v1",
      kind: "Foo",
      metadata: {
        name: "some-obj-name",
        resourceVersion: "1",
        uid: "some-uid",
        selfLink: "/some/self/link",
      },
    });
    const list = vi
      .fn()
      .mockRejectedValueOnce(new DOMException("signal is aborted without reason", "AbortError"))
      .mockResolvedValueOnce([obj]);
    const store = new RealLoadItemsKubeObjectStore({ isNamespaced: false, list });

    const result = await store.loadAll({ onLoadFailure });

    expect(result).toBeUndefined();
    expect(onLoadFailure).not.toHaveBeenCalled();
    expect(store.failedLoading).toBe(false);
    // the store must not believe it is loaded: the next load (e.g. the view
    // mounting again) has to populate it
    expect(store.isLoaded).toBe(false);

    await store.loadAll({ onLoadFailure });

    expect(store.items).toContain(obj);
    expect(store.isLoaded).toBe(true);
    expect(onLoadFailure).not.toHaveBeenCalled();
  });

  it("keeps the loaded items and the loaded state when a cluster-scoped/all-namespaces reload is aborted", async () => {
    const onLoadFailure = vi.fn();
    const first = new KubeObject({
      apiVersion: "v1",
      kind: "Foo",
      metadata: {
        name: "first",
        resourceVersion: "1",
        uid: "uid-first",
        selfLink: "/some/self/link/first",
      },
    });
    const second = new KubeObject({
      apiVersion: "v1",
      kind: "Foo",
      metadata: {
        name: "second",
        resourceVersion: "2",
        uid: "uid-second",
        selfLink: "/some/self/link/second",
      },
    });
    const list = vi
      .fn()
      .mockResolvedValueOnce([first])
      .mockRejectedValueOnce(new DOMException("signal is aborted without reason", "AbortError"))
      .mockResolvedValueOnce([second]);
    const store = new RealLoadItemsKubeObjectStore({ isNamespaced: false, list });

    await store.loadAll({ onLoadFailure });

    expect(store.items).toContain(first);
    expect(store.isLoaded).toBe(true);

    const result = await store.loadAll({ onLoadFailure });

    expect(result).toBeUndefined();
    expect(onLoadFailure).not.toHaveBeenCalled();
    // the aborted reload leaves everything as it was
    expect(store.items).toContain(first);
    expect(store.items).toHaveLength(1);
    expect(store.isLoaded).toBe(true);
    expect(store.failedLoading).toBe(false);

    await store.loadAll({ onLoadFailure });

    expect(store.items).toContain(second);
    expect(store.items).toHaveLength(1);
    expect(onLoadFailure).not.toHaveBeenCalled();
  });

  it("treats a cluster-scoped/all-namespaces failure on an already-aborted signal as an abort", async () => {
    const onLoadFailure = vi.fn();
    const obj = new KubeObject({
      apiVersion: "v1",
      kind: "Foo",
      metadata: {
        name: "some-obj-name",
        resourceVersion: "1",
        uid: "some-uid",
        selfLink: "/some/self/link",
      },
    });
    const list = vi.fn().mockResolvedValueOnce([obj]).mockRejectedValueOnce(new Error("boom"));
    const store = new RealLoadItemsKubeObjectStore({ isNamespaced: false, list });

    await store.loadAll({ onLoadFailure });

    const controller = new AbortController();

    controller.abort();

    const result = await store.loadAll({ reqInit: { signal: controller.signal } as RequestInit, onLoadFailure });

    expect(result).toBeUndefined();
    expect(onLoadFailure).not.toHaveBeenCalled();
    expect(store.items).toContain(obj);
    expect(store.isLoaded).toBe(true);
    expect(store.failedLoading).toBe(false);
  });

  it("still reports a genuine cluster-scoped/all-namespaces load failure through onLoadFailure", async () => {
    const onLoadFailure = vi.fn();
    const list = vi.fn().mockRejectedValueOnce(new Error("boom"));
    const store = new RealLoadItemsKubeObjectStore({ isNamespaced: false, list });

    await store.loadAll({ onLoadFailure });

    expect(onLoadFailure).toHaveBeenCalledTimes(1);
    expect(onLoadFailure.mock.calls[0][0].message).toContain("Failed to load");
  });

  it("does not report an aborted namespaced load through onLoadFailure", async () => {
    const onLoadFailure = vi.fn();
    const list = vi.fn().mockRejectedValueOnce(new DOMException("The operation was aborted.", "AbortError"));
    const store = new RealLoadItemsKubeObjectStore({ isNamespaced: true, list }, () => false);

    const result = await store.loadAll({ namespaces: ["some-namespace"], onLoadFailure });

    expect(result).toBeUndefined();
    expect(onLoadFailure).not.toHaveBeenCalled();
    expect(store.failedLoading).toBe(false);
  });

  it("treats a namespaced failure on an already-aborted signal as an abort", async () => {
    const onLoadFailure = vi.fn();
    const list = vi.fn().mockRejectedValueOnce(new Error("boom"));
    const store = new RealLoadItemsKubeObjectStore({ isNamespaced: true, list }, () => false);
    const controller = new AbortController();

    controller.abort();

    const result = await store.loadAll({
      namespaces: ["some-namespace"],
      reqInit: { signal: controller.signal } as RequestInit,
      onLoadFailure,
    });

    expect(result).toBeUndefined();
    expect(onLoadFailure).not.toHaveBeenCalled();
    expect(store.failedLoading).toBe(false);
  });

  it("still reports a genuine namespaced load failure through onLoadFailure", async () => {
    const onLoadFailure = vi.fn();
    const list = vi.fn().mockRejectedValueOnce(new Error("boom"));
    const store = new RealLoadItemsKubeObjectStore({ isNamespaced: true, list }, () => false);

    await store.loadAll({ namespaces: ["some-namespace"], onLoadFailure });

    expect(onLoadFailure).toHaveBeenCalledTimes(1);
    expect(onLoadFailure.mock.calls[0][0].message).toContain("Failed to load");
  });

  describe("updateFromEventsBuffer", () => {
    const data = (uid: string, resourceVersion = "1", name = uid): KubeJsonApiDataFor<KubeObject> => ({
      apiVersion: "v1",
      kind: "Test",
      metadata: { uid, name, resourceVersion, selfLink: `/test/${uid}` },
    });
    let store: FakeKubeObjectStore;
    let itemsChanged = vi.fn<() => void>();
    let stopObserving: () => void;

    beforeEach(() => {
      vi.useFakeTimers();
      store = new FakeKubeObjectStore(() => [], { objectConstructor: KubeObject });
      store.items.replace(["a", "b", "c", "d"].map((uid) => new KubeObject(data(uid))));
      itemsChanged = vi.fn<() => void>();
      stopObserving = observe(store.items, itemsChanged);
    });

    afterEach(() => {
      stopObserving();
      vi.clearAllTimers();
      vi.useRealTimers();
      vi.restoreAllMocks();
    });

    it("replaces a modified middle item without moving it", () => {
      const before = store.getItems();

      store["eventsBuffer"].push({ type: "MODIFIED", object: { ...data("b", "2"), status: { ready: true } } });
      store["updateFromEventsBuffer"]();

      expect(store.items.map((item) => item.getId())).toEqual(["a", "b", "c", "d"]);
      expect(store.items[1]).not.toBe(before[1]);
      expect(store.items[1]).toBeInstanceOf(KubeObject);
      expect(store.items[1].status).toEqual({ ready: true });
      expect(store.items[0]).toBe(before[0]);
      expect(store.items[2]).toBe(before[2]);
      expect(store.items[3]).toBe(before[3]);
    });

    it.each(["ADDED", "MODIFIED"] as const)(
      "keeps the object and does not publish a same-version %s replay",
      (type) => {
        const before = store.items[1];
        const construct = vi.spyOn(store.api, "objectConstructor");

        store["eventsBuffer"].push({ type, object: data("b") });
        store["updateFromEventsBuffer"]();

        expect(store.items[1]).toBe(before);
        expect(construct).not.toHaveBeenCalled();
        expect(itemsChanged).not.toHaveBeenCalled();
        expect(store["eventsBuffer"]).toHaveLength(0);
      },
    );

    it("does not treat empty resource versions as a replay", () => {
      const before = new KubeObject(data("b", ""));

      store.items.replace([before]);
      store["eventsBuffer"].push({ type: "MODIFIED", object: data("b", "") });
      store["updateFromEventsBuffer"]();

      expect(store.items[0]).not.toBe(before);
    });

    it("compacts two deletions without holes or sorting", () => {
      const before = store.getItems();
      const sort = vi.spyOn(store, "sortItems" as never);

      store["eventsBuffer"].push({ type: "DELETED", object: data("a") }, { type: "DELETED", object: data("c") });
      store["updateFromEventsBuffer"]();

      expect(store.getItems()).toEqual([before[1], before[3]]);
      expect(sort).not.toHaveBeenCalled();
    });

    it("sorts an inserted item into place", () => {
      const sort = vi.spyOn(store, "sortItems" as never);

      store["eventsBuffer"].push({ type: "ADDED", object: data("aa") });
      store["updateFromEventsBuffer"]();

      expect(store.items.map((item) => item.getId())).toEqual(["a", "aa", "b", "c", "d"]);
      expect(sort).toHaveBeenCalledTimes(1);
    });

    it("does not sort a status-only modification", () => {
      const sort = vi.spyOn(store, "sortItems" as never);

      store["eventsBuffer"].push({ type: "MODIFIED", object: { ...data("b", "2"), status: { ready: true } } });
      store["updateFromEventsBuffer"]();

      expect(store.items[1].status).toEqual({ ready: true });
      expect(sort).not.toHaveBeenCalled();
    });

    it("sorts when the default sort key changes", () => {
      const sort = vi.spyOn(store, "sortItems" as never);

      store["eventsBuffer"].push({ type: "MODIFIED", object: data("b", "2", "z") });
      store["updateFromEventsBuffer"]();

      expect(store.items.map((item) => item.getId())).toEqual(["a", "c", "d", "b"]);
      expect(sort).toHaveBeenCalledTimes(1);
    });

    it("ignores ERROR events without publishing items", () => {
      store["eventsBuffer"].push({ type: "ERROR" });
      store["updateFromEventsBuffer"]();

      expect(store.items.map((item) => item.getId())).toEqual(["a", "b", "c", "d"]);
      expect(itemsChanged).not.toHaveBeenCalled();
    });

    it("warns and skips events without a uid", () => {
      const warn = vi.spyOn(store["dependencies"].logger, "warn");
      const event = { type: "MODIFIED" as const, object: data("") };

      store["eventsBuffer"].push(event);
      store["updateFromEventsBuffer"]();

      expect(warn).toHaveBeenCalledWith("[KUBE-STORE]: watch event did not have defined .metadata.uid, skipping", {
        event,
      });
      expect(itemsChanged).not.toHaveBeenCalled();
    });

    it("caps the list before sorting", () => {
      store = new FakeKubeObjectStore(() => [], { objectConstructor: KubeObject }, { bufferSize: 2 });
      store.items.replace(["b", "c"].map((uid) => new KubeObject(data(uid))));
      store["eventsBuffer"].push({ type: "ADDED", object: data("a") });
      store["updateFromEventsBuffer"]();

      expect(store.items.map((item) => item.getId())).toEqual(["a", "c"]);
    });

    it("handles deletion, reinsertion and repeated updates of a uid in one batch", () => {
      store["eventsBuffer"].push(
        { type: "DELETED", object: data("b") },
        { type: "ADDED", object: data("b", "2") },
        { type: "MODIFIED", object: data("b", "3") },
        { type: "DELETED", object: data("a") },
        { type: "DELETED", object: data("a") },
        { type: "MODIFIED", object: data("d", "2") },
      );
      store["updateFromEventsBuffer"]();

      expect(store.items.map((item) => [item.getId(), item.getResourceVersion()])).toEqual([
        ["b", "3"],
        ["c", "1"],
        ["d", "2"],
      ]);
    });

    it("rebuilds the index after items are replaced between flushes", () => {
      store["eventsBuffer"].push({ type: "MODIFIED", object: data("b", "2") });
      store["updateFromEventsBuffer"]();
      store.items.replace([new KubeObject(data("d")), new KubeObject(data("e"))]);
      store["eventsBuffer"].push({ type: "MODIFIED", object: data("e", "2") });
      store["updateFromEventsBuffer"]();

      expect(store.items.map((item) => [item.getId(), item.getResourceVersion()])).toEqual([
        ["d", "1"],
        ["e", "2"],
      ]);
    });

    it("keeps sorting for an inherited custom comparator without a sort key", () => {
      class CustomSortStore extends FakeKubeObjectStore {
        protected sortItems(items: KubeObject[]) {
          return super.sortItems(items, [(item) => item.metadata.labels?.rank]);
        }
      }
      class InheritedSortStore extends CustomSortStore {}

      store = new InheritedSortStore(() => [], { objectConstructor: KubeObject });
      store.items.replace(
        ["a", "b"].map(
          (uid) => new KubeObject({ ...data(uid), metadata: { ...data(uid).metadata, labels: { rank: uid } } }),
        ),
      );
      const sort = vi.spyOn(store, "sortItems" as never);

      store["eventsBuffer"].push({
        type: "MODIFIED",
        object: { ...data("a", "2"), metadata: { ...data("a", "2").metadata, labels: { rank: "z" } } },
      });
      store["updateFromEventsBuffer"]();

      expect(store.items.map((item) => item.getId())).toEqual(["b", "a"]);
      expect(sort).toHaveBeenCalledTimes(1);
    });
  });

  describe("patch and update", () => {
    const data = (uid: string, resourceVersion = "1", name = uid): KubeJsonApiDataFor<KubeObject> => ({
      apiVersion: "v1",
      kind: "Test",
      metadata: { uid, name, resourceVersion, selfLink: `/test/${uid}` },
    });
    let returned: KubeJsonApiDataFor<KubeObject>;
    let store: FakeKubeObjectStore;

    beforeEach(() => {
      vi.useFakeTimers();
      store = new FakeKubeObjectStore(() => [], {
        objectConstructor: KubeObject,
        patch: async () => new KubeObject(returned),
        update: async () => new KubeObject(returned),
      });
      store.items.replace(["a", "b", "c", "d"].map((uid) => new KubeObject(data(uid))));
    });

    afterEach(() => {
      vi.clearAllTimers();
      vi.useRealTimers();
      vi.restoreAllMocks();
    });

    const ids = () => store.items.map((item) => item.getId());
    const write = {
      patch: (item: KubeObject) => store.patch(item, []),
      update: (item: KubeObject) => store.update(item, {}),
    };

    describe.each(["patch", "update"] as const)("%s", (method) => {
      it("sorts when the sort key changes, and the list stays sorted through the watch replay", async () => {
        returned = data("b", "2", "z");
        await write[method](store.items[1]);

        expect(ids()).toEqual(["a", "c", "d", "b"]);

        store["eventsBuffer"].push({ type: "MODIFIED", object: data("b", "2", "z") });
        store["updateFromEventsBuffer"]();
        store["eventsBuffer"].push({ type: "MODIFIED", object: { ...data("b", "3", "z"), status: { ready: true } } });
        store["updateFromEventsBuffer"]();

        expect(ids()).toEqual(["a", "c", "d", "b"]);
        expect(store.items[3].getResourceVersion()).toBe("3");
      });

      it("replaces the item in place without sorting when the sort key does not change", async () => {
        const sort = vi.spyOn(store, "sortItems" as never);

        returned = { ...data("b", "2"), status: { ready: true } };
        await write[method](store.items[1]);

        expect(ids()).toEqual(["a", "b", "c", "d"]);
        expect(store.items[1].status).toEqual({ ready: true });
        expect(sort).not.toHaveBeenCalled();
      });

      it("sorts an item that was not in the store into place", async () => {
        returned = data("bb");
        await write[method](new KubeObject(data("bb")));

        expect(ids()).toEqual(["a", "b", "bb", "c", "d"]);
      });
    });
  });

  describe("subscribe", () => {
    const createWatchedStore = () => {
      const watchSignals: AbortSignal[] = [];
      const watchCallbacks: Array<(data: null, error: unknown) => void> = [];
      const watch = vi.fn((opts: KubeApiWatchOptions<KubeObject, KubeJsonApiDataFor<KubeObject>>) => {
        // Like KubeApi.watch, which wraps the controller it is given
        const controller = new WrappedAbortController(opts.abortController);

        watchSignals.push(controller.signal);
        watchCallbacks.push(opts.callback as (data: null, error: unknown) => void);

        return () => controller.abort();
      });
      const store = new FakeKubeObjectStore(() => [], {
        isNamespaced: false,
        getResourceVersion: () => "1",
        watch,
      });

      return { store, watch, watchSignals, watchCallbacks };
    };

    afterEach(() => {
      vi.useRealTimers();
    });

    it("aborts the watch request when the subscription is disposed", async () => {
      const { store, watchSignals } = createWatchedStore();

      await store.loadAll({});

      const unsubscribe = store.subscribe();

      expect(watchSignals).toHaveLength(1);
      expect(watchSignals[0].aborted).toBe(false);

      unsubscribe();

      expect(watchSignals[0].aborted).toBe(true);
    });

    it("aborts the watch request when the controller it was given aborts", async () => {
      const { store, watchSignals } = createWatchedStore();
      const abortController = new AbortController();

      await store.loadAll({});
      store.subscribe({ abortController });
      abortController.abort();

      expect(watchSignals).toHaveLength(1);
      expect(watchSignals[0].aborted).toBe(true);
    });

    it("does not start a watch for a controller that has already aborted", async () => {
      const { store, watch } = createWatchedStore();
      const abortController = new AbortController();

      await store.loadAll({});
      abortController.abort();
      store.subscribe({ abortController });

      expect(watch).not.toHaveBeenCalled();
    });

    it("aborts a watch request restarted after an error when the subscription is disposed", async () => {
      const { store, watchSignals, watchCallbacks } = createWatchedStore();

      await store.loadAll({});
      vi.useFakeTimers();

      const unsubscribe = store.subscribe();

      watchCallbacks[0](null, new Error("stream broke"));
      vi.advanceTimersByTime(5000);

      expect(watchSignals).toHaveLength(2);
      expect(watchSignals[1].aborted).toBe(false);

      unsubscribe();

      expect(watchSignals.every((signal) => signal.aborted)).toBe(true);
    });

    it("does not restart a watch request that failed because it was aborted", async () => {
      const { store, watch, watchCallbacks } = createWatchedStore();

      await store.loadAll({});
      vi.useFakeTimers();

      const unsubscribe = store.subscribe();

      unsubscribe();
      // the fetch of an aborted watch rejects with a DOMException
      watchCallbacks[0](null, new DOMException("signal is aborted without reason", "AbortError"));
      vi.advanceTimersByTime(60_000);

      expect(watch).toHaveBeenCalledTimes(1);
    });
  });
});
