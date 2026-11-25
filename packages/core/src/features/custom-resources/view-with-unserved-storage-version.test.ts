/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { CustomResourceDefinition } from "@freelensapp/kube-object";
import { beforeEach, describe, expect, it } from "vitest";
import navigateToCustomResourcesInjectable from "../../common/front-end-routing/routes/cluster/custom-resources/navigate-to-custom-resources.injectable";
import customResourceDefinitionStoreInjectable from "../../renderer/components/custom-resource-definitions/store.injectable";
import { getApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";
import subscribeStoresInjectable from "../../renderer/kube-watch-api/subscribe-stores.injectable";

import type { RenderResult } from "@testing-library/react";

import type { ApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";

describe("Viewing Custom Resources of a CRD whose storage version is not served", () => {
  let builder: ApplicationBuilder;
  let result: RenderResult;
  let subscribedApiBases: string[];

  beforeEach(async () => {
    subscribedApiBases = [];

    builder = getApplicationBuilder();
    builder.setEnvironmentToClusterFrame();

    builder.beforeWindowStart(({ windowDi }) => {
      // The view lists and watches the resources through the stores it subscribes.
      windowDi.override(subscribeStoresInjectable, () => (stores) => {
        subscribedApiBases.push(...stores.map((store) => store.api.apiBase));

        return () => {};
      });
    });

    builder.afterWindowStart(({ windowDi }) => {
      const customResourceDefinitionStore = windowDi.inject(customResourceDefinitionStoreInjectable);

      customResourceDefinitionStore.items.replace([
        new CustomResourceDefinition({
          apiVersion: "apiextensions.k8s.io/v1",
          kind: "CustomResourceDefinition",
          metadata: {
            name: "examples.example.freelens.app",
            selfLink: "/apis/apiextensions.k8s.io/v1/customresourcedefinitions/examples.example.freelens.app",
            uid: "some-uid",
            resourceVersion: "1",
          },
          spec: {
            group: "example.freelens.app",
            scope: "Cluster",
            names: {
              kind: "Example",
              plural: "examples",
              singular: "example",
            },
            versions: [
              { name: "v1alpha1", served: true, storage: false },
              { name: "v1alpha2", served: false, storage: true },
            ],
          },
        }),
      ]);
    });

    result = await builder.render();

    builder.allowKubeResource({
      group: "/apis/apiextensions.k8s.io/v1",
      apiName: "customresourcedefinitions",
    });

    const windowDi = builder.applicationWindow.only.di;
    const navigateToCustomResources = windowDi.inject(navigateToCustomResourcesInjectable);

    navigateToCustomResources({
      group: "example.freelens.app",
      name: "examples",
    });
  });

  it("shows the table for the custom resource", () => {
    expect(result.getByText("Example")).toBeInTheDocument();
  });

  it("lists and watches the custom resources through the served version", () => {
    expect(subscribedApiBases).toContain("/apis/example.freelens.app/v1alpha1/examples");
    expect(subscribedApiBases).not.toContain("/apis/example.freelens.app/v1alpha2/examples");
  });
});
