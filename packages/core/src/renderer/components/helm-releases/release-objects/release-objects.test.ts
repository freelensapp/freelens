/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { reaction } from "mobx";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fetchInjectable from "../../../../common/fetch/fetch.injectable";
import createKubeJsonApiInjectable from "../../../../common/k8s-api/create-kube-json-api.injectable";
import { createMockResponseFromStream, createMockResponseFromString } from "../../../../test-utils/mock-responses";
import clusterFrameContextForNamespacedResourcesInjectable from "../../../cluster-frame-context/for-namespaced-resources.injectable";
import { getDiForUnitTesting } from "../../../getDiForUnitTesting";
import apiKubeInjectable from "../../../k8s/api-kube.injectable";
import subscribeStoresInjectable from "../../../kube-watch-api/subscribe-stores.injectable";
import storesAndApisCanBeCreatedInjectable from "../../../stores-apis-can-be-created.injectable";
import { metadataListAccept, metadataWatchAccept } from "./helm-release-object-api";
import releaseObjectsInjectable from "./release-objects.injectable";

import type { Fetch } from "@freelensapp/json-api";

import type { DiContainer } from "@ogre-tools/injectable";

const server = "http://127.0.0.1:9999/api-kube";

const releaseObject = (name: string, resourceVersion: string) => ({
  kind: "PartialObjectMetadata",
  apiVersion: "meta.k8s.io/v1",
  metadata: {
    name,
    namespace: "ns",
    uid: `uid-of-${name}`,
    resourceVersion,
    labels: { owner: "helm", name: "a", status: "deployed" },
  },
});

describe("the trigger that reloads the list of Helm releases", () => {
  let di: DiContainer;
  let fetchMock: ReturnType<typeof vi.fn<Fetch>>;
  let watches: Map<string, ReadableStreamDefaultController<Uint8Array>>;
  let changes: number;
  let stopObserving: () => void;

  const requests = () =>
    fetchMock.mock.calls.map(([url, init]) => ({
      url: String(url).replace(server, ""),
      accept: (init?.headers as Record<string, string> | undefined)?.accept,
    }));

  const sendWatchEvent = (resource: string, event: object) => {
    const watch = [...watches].find(([url]) => url.includes(`/${resource}?`));

    watch?.[1].enqueue(new TextEncoder().encode(`${JSON.stringify(event)}\n`));
  };

  beforeEach(async () => {
    vi.useFakeTimers();

    di = getDiForUnitTesting();
    watches = new Map();
    changes = 0;

    di.override(storesAndApisCanBeCreatedInjectable, () => true);
    di.override(clusterFrameContextForNamespacedResourcesInjectable, () => ({
      allNamespaces: ["ns", "other"],
      contextNamespaces: ["ns"],
      hasSelectedAll: false,
      isLoadingAll: () => false,
      isGlobalWatchEnabled: () => true,
    }));

    fetchMock = vi.fn<Fetch>(async (input) => {
      const url = String(input);

      if (url.includes("watch=1")) {
        const stream = new ReadableStream<Uint8Array>({
          start: (controller) => {
            watches.set(url, controller);
          },
        });

        return createMockResponseFromStream(url, stream);
      }

      return createMockResponseFromString(
        url,
        JSON.stringify({
          kind: "PartialObjectMetadataList",
          apiVersion: "meta.k8s.io/v1",
          metadata: { resourceVersion: "1" },
          // The API server sends `null`, not an empty array, for an empty list of metadata.
          items: url.includes("/secrets?") ? [releaseObject("sh.helm.release.v1.a.v1", "1")] : null,
        }),
      );
    });
    di.override(fetchInjectable, () => fetchMock);

    const createKubeJsonApi = di.inject(createKubeJsonApiInjectable);

    di.override(apiKubeInjectable, () =>
      createKubeJsonApi({ serverAddress: "http://127.0.0.1:9999", apiBase: "/api-kube" }),
    );

    // What the watch API does for the stores, without following the selection
    // of namespaces.
    di.override(subscribeStoresInjectable, () => (stores) => {
      const abortController = new AbortController();

      for (const store of stores) {
        void store.loadAll({ namespaces: ["ns"] }).then(() => store.subscribe({ abortController }));
      }

      return () => abortController.abort();
    });

    stopObserving = reaction(
      () => di.inject(releaseObjectsInjectable).get(),
      () => changes++,
    );

    await vi.advanceTimersByTimeAsync(0);
  });

  afterEach(() => {
    stopObserving();
    vi.useRealTimers();
  });

  it("lists and watches only the metadata of the objects labelled by Helm", () => {
    expect(requests()).toEqual([
      {
        url: "/api/v1/namespaces/ns/secrets?labelSelector=owner%3Dhelm",
        accept: metadataListAccept,
      },
      {
        url: "/api/v1/namespaces/ns/configmaps?labelSelector=owner%3Dhelm",
        accept: metadataListAccept,
      },
      {
        url: "/api/v1/namespaces/ns/secrets?watch=1&resourceVersion=1&labelSelector=owner%3Dhelm&timeoutSeconds=600",
        accept: metadataWatchAccept,
      },
      {
        url: "/api/v1/namespaces/ns/configmaps?watch=1&resourceVersion=1&labelSelector=owner%3Dhelm&timeoutSeconds=600",
        accept: metadataWatchAccept,
      },
    ]);
  });

  it("changes once the first list arrives", () => {
    expect(changes).toBe(1);
    expect(
      di
        .inject(releaseObjectsInjectable)
        .get()
        .map((object) => object.getName()),
    ).toEqual(["sh.helm.release.v1.a.v1"]);
  });

  it("changes when a release Secret changes", async () => {
    sendWatchEvent("secrets", { type: "ADDED", object: releaseObject("sh.helm.release.v1.a.v2", "2") });
    await vi.advanceTimersByTimeAsync(1000);

    expect(changes).toBe(2);
  });

  it("changes when a release ConfigMap changes", async () => {
    sendWatchEvent("configmaps", { type: "ADDED", object: releaseObject("sh.helm.release.v1.b.v1", "2") });
    await vi.advanceTimersByTimeAsync(1000);

    expect(changes).toBe(2);
  });

  it("does not change for an event that replays an object it has", async () => {
    sendWatchEvent("secrets", { type: "MODIFIED", object: releaseObject("sh.helm.release.v1.a.v1", "1") });
    await vi.advanceTimersByTimeAsync(1000);

    expect(changes).toBe(1);
  });
});
