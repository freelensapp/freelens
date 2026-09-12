/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { KubeObject } from "@freelensapp/kube-object";
import { noop } from "@freelensapp/utilities";
import { KubeObjectStore } from "../kube-object.store";

import type { FetchRequestInit as RequestInit } from "@freelensapp/json-api";
import type { KubeApi } from "@freelensapp/kube-api";

import type { KubeObjectStoreLoadingParams } from "../kube-object.store";

class FakeKubeObjectStore extends KubeObjectStore<KubeObject> {
  constructor(
    private readonly _loadItems: (params: KubeObjectStoreLoadingParams) => KubeObject[],
    api: Partial<KubeApi<KubeObject>>,
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
    const list = vi.fn().mockRejectedValueOnce(new DOMException("The operation was aborted.", "AbortError"));
    const store = new RealLoadItemsKubeObjectStore({ isNamespaced: false, list });

    const result = await store.loadAll({ onLoadFailure });

    expect(result).toBeUndefined();
    expect(onLoadFailure).not.toHaveBeenCalled();
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

  it("still reports a genuine namespaced load failure through onLoadFailure", async () => {
    const onLoadFailure = vi.fn();
    const list = vi.fn().mockRejectedValueOnce(new Error("boom"));
    const store = new RealLoadItemsKubeObjectStore({ isNamespaced: true, list }, () => false);

    await store.loadAll({ namespaces: ["some-namespace"], onLoadFailure });

    expect(onLoadFailure).toHaveBeenCalledTimes(1);
    expect(onLoadFailure.mock.calls[0][0].message).toContain("Failed to load");
  });
});
