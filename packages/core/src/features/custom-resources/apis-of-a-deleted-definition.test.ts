/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { CustomResourceDefinition } from "@freelensapp/kube-object";
import { noop } from "@freelensapp/utilities";
import { beforeEach, describe, expect, it, vi } from "vitest";
import apiManagerInjectable from "../../common/k8s-api/api-manager/manager.injectable";
import customResourceDefinitionStoreInjectable from "../../renderer/components/custom-resource-definitions/store.injectable";
import { getApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";

import type { KubeApiWatchOptions } from "@freelensapp/kube-api";

import type { ApiManager } from "../../common/k8s-api/api-manager";
import type { CustomResourceDefinitionStore } from "../../renderer/components/custom-resource-definitions/store";

const v1ApiBase = "/apis/example.freelens.app/v1/examples";
const v1alpha2ApiBase = "/apis/example.freelens.app/v1alpha2/examples";

const toDefinition = (resourceVersion: string, deletionTimestamp?: string) =>
  new CustomResourceDefinition({
    apiVersion: "apiextensions.k8s.io/v1",
    kind: "CustomResourceDefinition",
    metadata: {
      name: "examples.example.freelens.app",
      selfLink: "/apis/apiextensions.k8s.io/v1/customresourcedefinitions/examples.example.freelens.app",
      uid: "some-uid",
      resourceVersion,
      deletionTimestamp,
    },
    spec: {
      group: "example.freelens.app",
      scope: "Cluster",
      names: {
        kind: "Example",
        plural: "examples",
      },
      versions: [
        { name: "v1", served: true, storage: true },
        { name: "v1alpha2", served: true, storage: false },
      ],
    },
  });

const toOtherDefinition = (resourceVersion: string) =>
  new CustomResourceDefinition({
    apiVersion: "apiextensions.k8s.io/v1",
    kind: "CustomResourceDefinition",
    metadata: {
      name: "others.example.freelens.app",
      selfLink: "/apis/apiextensions.k8s.io/v1/customresourcedefinitions/others.example.freelens.app",
      uid: "some-other-uid",
      resourceVersion,
    },
    spec: {
      group: "example.freelens.app",
      scope: "Cluster",
      names: {
        kind: "Other",
        plural: "others",
      },
      versions: [{ name: "v1", served: true, storage: true }],
    },
  });

describe("APIs of a custom resource definition that is deleted", () => {
  let apiManager: ApiManager;
  let customResourceDefinitionStore: CustomResourceDefinitionStore;
  let watchSignal: AbortSignal | undefined;

  beforeEach(async () => {
    const builder = getApplicationBuilder();

    builder.setEnvironmentToClusterFrame();
    await builder.render();

    const windowDi = builder.applicationWindow.only.di;

    apiManager = windowDi.inject(apiManagerInjectable);
    customResourceDefinitionStore = windowDi.inject(customResourceDefinitionStoreInjectable);

    customResourceDefinitionStore.items.replace([toDefinition("1"), toOtherDefinition("1")]);

    const store = apiManager.getStore(v1ApiBase);

    if (!store) {
      throw new Error(`Expected a store for ${v1ApiBase}`);
    }

    watchSignal = undefined;
    vi.spyOn(store.api, "watch").mockImplementation((opts?: KubeApiWatchOptions<any, any>) => {
      watchSignal = opts?.abortController?.signal;

      return noop;
    });
    store.api.setResourceVersion("", "1");
    store.subscribe();

    // Any change to the list of definitions, here to another one, then the
    // deletion itself, which is a MODIFIED event that sets the deletion
    // timestamp before the DELETED event that removes it.
    customResourceDefinitionStore.items.replace([toDefinition("1"), toOtherDefinition("2")]);
    customResourceDefinitionStore.items.replace([toDefinition("2", "2026-10-09T00:00:00Z"), toOtherDefinition("2")]);
  });

  it("has a watch on the store of the definition before the deletion", () => {
    expect(watchSignal?.aborted).toBe(false);
  });

  describe("when the definition is removed", () => {
    beforeEach(() => {
      customResourceDefinitionStore.items.replace([toOtherDefinition("2")]);
    });

    it.each([v1ApiBase, v1alpha2ApiBase])("removes the API of %s", (apiBase) => {
      expect(apiManager.getApi(apiBase)).toBeUndefined();
    });

    it.each([v1ApiBase, v1alpha2ApiBase])("removes the store of %s", (apiBase) => {
      expect(apiManager.getStore(apiBase)).toBeUndefined();
    });

    it("stops the watch of the store", () => {
      expect(watchSignal?.aborted).toBe(true);
    });

    it("keeps the API of the definition that is still there", () => {
      expect(apiManager.getApi("/apis/example.freelens.app/v1/others")).toBeDefined();
    });

    describe("when the definition is created again", () => {
      beforeEach(() => {
        customResourceDefinitionStore.items.replace([toDefinition("3"), toOtherDefinition("2")]);
      });

      it("gives it a new store for its new API", () => {
        const api = apiManager.getApi(v1ApiBase);

        expect(api).toBeDefined();
        expect(apiManager.getStore(v1ApiBase)?.api).toBe(api);
      });
    });
  });
});
