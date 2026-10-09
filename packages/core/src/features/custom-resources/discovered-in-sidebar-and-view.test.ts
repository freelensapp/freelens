/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { CustomResourceDefinition, KubeObject } from "@freelensapp/kube-object";
import { act, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import navigateToCustomResourcesInjectable from "../../common/front-end-routing/routes/cluster/custom-resources/navigate-to-custom-resources.injectable";
import apiManagerInjectable from "../../common/k8s-api/api-manager/manager.injectable";
import hostedClusterInjectable from "../../renderer/cluster-frame-context/hosted-cluster.injectable";
import customResourceDefinitionStoreInjectable from "../../renderer/components/custom-resource-definitions/store.injectable";
import kubeDetailsUrlParamInjectable from "../../renderer/components/kube-detail-params/kube-details-url.injectable";
import { getApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";

import type { DiContainer } from "@ogre-tools/injectable";
import type { RenderResult } from "@testing-library/react";

import type { KubeApiResource } from "../../common/rbac";
import type { CustomResourceDefinitionStore } from "../../renderer/components/custom-resource-definitions/store";
import type { ApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";

const group = "gateway.networking.k8s.io";
const groupItemTestId = `sidebar-item-custom-resource-group-${group}`;
const httpRoutesItemTestId = `${groupItemTestId}/httproutes`;
const gatewaysItemTestId = `${groupItemTestId}/gateways`;

// What discovery reports: custom resources of one group, one of them in two
// served versions, the preferred one first, and with a subresource, next to
// resources of the groups Kubernetes defines itself.
const discoveredResources: KubeApiResource[] = [
  { group: "", version: "v1", apiName: "pods", kind: "Pod", namespaced: true },
  {
    group: "certificates.k8s.io",
    version: "v1",
    apiName: "certificatesigningrequests",
    kind: "CertificateSigningRequest",
    namespaced: false,
  },
  { group, version: "v1", apiName: "httproutes", kind: "HTTPRoute", namespaced: true },
  { group, version: "v1", apiName: "httproutes/status", kind: "HTTPRoute", namespaced: true },
  { group, version: "v1", apiName: "gateways", kind: "Gateway", namespaced: true },
  { group, version: "v1beta1", apiName: "httproutes", kind: "HTTPRoute", namespaced: true },
];

const gatewayDefinition = new CustomResourceDefinition({
  apiVersion: "apiextensions.k8s.io/v1",
  kind: "CustomResourceDefinition",
  metadata: {
    name: `gateways.${group}`,
    selfLink: `/apis/apiextensions.k8s.io/v1/customresourcedefinitions/gateways.${group}`,
    uid: "some-crd-uid",
    resourceVersion: "1",
  },
  spec: {
    group,
    scope: "Namespaced",
    names: {
      kind: "Gateway",
      plural: "gateways",
      singular: "gateway",
    },
    versions: [{ name: "v1", served: true, storage: true }],
  },
});

const someRoute = new KubeObject({
  apiVersion: `${group}/v1`,
  kind: "HTTPRoute",
  metadata: {
    name: "some-route",
    namespace: "default",
    selfLink: `/apis/${group}/v1/namespaces/default/httproutes/some-route`,
    uid: "some-route-uid",
    resourceVersion: "1",
  },
});

describe("Custom resources known from discovery, for a user who may not list the definitions", () => {
  let builder: ApplicationBuilder;
  let result: RenderResult;
  let windowDi: DiContainer;
  let customResourceDefinitionStore: CustomResourceDefinitionStore;

  const loadDefinitions = (list: () => Promise<CustomResourceDefinition[]>) =>
    act(async () => {
      vi.spyOn(customResourceDefinitionStore.api, "list").mockImplementation(list);
      await customResourceDefinitionStore.loadAll();
    });

  const refuseDefinitions = () =>
    loadDefinitions(() => Promise.reject(new Error(`customresourcedefinitions.apiextensions.k8s.io is forbidden`)));

  const getRows = () => result.container.querySelectorAll(".CustomResources .TableRow");

  const expandCustomResourcesGroup = async () => {
    await waitFor(() => result.getByTestId("expand-icon-for-sidebar-item-custom-resources").click(), {
      timeout: 300,
    });
    await waitFor(() => result.getByTestId(`expand-icon-for-${groupItemTestId}`).click(), { timeout: 300 });
  };

  beforeEach(async () => {
    builder = getApplicationBuilder();
    builder.setEnvironmentToClusterFrame();

    result = await builder.render();

    windowDi = builder.applicationWindow.only.di;
    customResourceDefinitionStore = windowDi.inject(customResourceDefinitionStoreInjectable);

    const hostedCluster = windowDi.inject(hostedClusterInjectable);

    if (!hostedCluster) {
      throw new Error("Expected a hosted cluster in the cluster frame");
    }

    hostedCluster.knownResources.replace(discoveredResources);

    // The user may list the custom resources, but not their definitions.
    builder.allowKubeResource({ group, apiName: "httproutes" });
    builder.allowKubeResource({ group, apiName: "gateways" });
    builder.namespaces.add("default");
    builder.namespaces.select("default");

    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  describe("when the list of definitions is refused", () => {
    beforeEach(async () => {
      await refuseDefinitions();
      await expandCustomResourcesGroup();
    });

    it("shows the API group of the discovered custom resources in the sidebar", () => {
      expect(result.getByTestId(groupItemTestId)).toBeInTheDocument();
    });

    it.each([
      [httpRoutesItemTestId, "HTTP Route"],
      [gatewaysItemTestId, "Gateway"],
    ])("shows the discovered kind %s in the sidebar", (testId, title) => {
      expect(result.getByTestId(testId)).toHaveTextContent(title);
    });

    it("shows no subresource and no resource of a group Kubernetes defines", () => {
      expect(result.queryByTestId(`${httpRoutesItemTestId}/status`)).not.toBeInTheDocument();
      expect(result.queryByTestId("sidebar-item-custom-resource-group-certificates.k8s.io")).not.toBeInTheDocument();
    });

    describe("when the discovered kind is opened from the sidebar", () => {
      beforeEach(async () => {
        const apiManager = windowDi.inject(apiManagerInjectable);

        // The view lists from the API of the preferred version.
        apiManager.getStore(`/apis/${group}/v1/httproutes`)?.items.replace([someRoute]);

        act(() => result.getByTestId(`link-for-${httpRoutesItemTestId}`).click());
      });

      it("shows the list of the kind", async () => {
        await waitFor(() => expect(result.getByText("HTTPRoute")).toBeInTheDocument(), { timeout: 300 });
      });

      it("lists the objects of the kind", async () => {
        await waitFor(() => expect(getRows()).toHaveLength(1), { timeout: 300 });
        expect(getRows()[0]).toHaveTextContent("some-route");
      });

      it("shows the default columns", async () => {
        await waitFor(
          () => {
            for (const title of ["Name", "Namespace", "Age"]) {
              expect(result.getByText(title, { selector: ".TableHead *" })).toBeInTheDocument();
            }
          },
          { timeout: 300 },
        );
      });

      it("shows no column of the definition", async () => {
        await waitFor(() => expect(getRows()).toHaveLength(1), { timeout: 300 });
        expect(getRows()[0]).toHaveTextContent("some-route");

        expect(result.container.querySelector('[data-testid^="custom-resource-column-title-"]')).toBeNull();
      });

      describe("when an object of the kind is opened in the details", () => {
        beforeEach(() => {
          act(() => windowDi.inject(kubeDetailsUrlParamInjectable).set(someRoute.selfLink));
        });

        it("shows the details of a custom resource", async () => {
          await waitFor(
            () => expect(result.container.querySelector(".CustomResourceDetails.HTTPRoute")).toBeInTheDocument(),
            { timeout: 300 },
          );
        });
      });
    });

    describe("when the list of definitions succeeds again", () => {
      beforeEach(async () => {
        await loadDefinitions(() => Promise.resolve([gatewayDefinition]));
      });

      it("shows the kinds of the definitions in the sidebar", async () => {
        await waitFor(() => expect(result.getByTestId(gatewaysItemTestId)).toHaveTextContent("Gateway"), {
          timeout: 300,
        });
      });

      it("does not show the kinds known from discovery only", async () => {
        await waitFor(() => expect(result.queryByTestId(httpRoutesItemTestId)).not.toBeInTheDocument(), {
          timeout: 300,
        });
      });
    });
  });

  describe("when the list of definitions is empty", () => {
    beforeEach(async () => {
      await loadDefinitions(() => Promise.resolve([]));
    });

    it("shows no custom resource in the sidebar", async () => {
      await waitFor(() => expect(result.queryByTestId("sidebar-item-custom-resources")).not.toBeInTheDocument(), {
        timeout: 300,
      });
      expect(result.queryByTestId(groupItemTestId)).not.toBeInTheDocument();
    });

    it("shows no list of a discovered kind", async () => {
      act(() => windowDi.inject(navigateToCustomResourcesInjectable)({ group, name: "httproutes" }));

      await waitFor(() => expect(result.queryByText("HTTPRoute")).not.toBeInTheDocument(), { timeout: 300 });
    });
  });
});
