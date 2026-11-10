/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { sidebarItemsInjectable } from "@freelensapp/cluster-sidebar";
import { CustomResourceDefinition, KubeObject } from "@freelensapp/kube-object";
import { loggerInjectionToken } from "@freelensapp/logger";
import { act, waitFor } from "@testing-library/react";
import { noop } from "es-toolkit";
import { beforeEach, describe, expect, it, vi } from "vitest";
import navigateToCustomResourceDefinitionsInjectable from "../../common/front-end-routing/routes/cluster/custom-resources/navigate-to-custom-resource-definitions.injectable";
import navigateToCustomResourcesInjectable from "../../common/front-end-routing/routes/cluster/custom-resources/navigate-to-custom-resources.injectable";
import navigateToFavoritesOverviewInjectable from "../../common/front-end-routing/routes/cluster/favorites/overview/navigate-to-favorites-overview.injectable";
import apiManagerInjectable from "../../common/k8s-api/api-manager/manager.injectable";
import { LensExtensionKubeObject } from "../../extensions/common-api/k8s-api";
import hostedClusterInjectable from "../../renderer/cluster-frame-context/hosted-cluster.injectable";
import sidebarNavigationCommandsInjectable from "../../renderer/components/command-palette/registered-commands/sidebar-navigation-commands.injectable";
import customResourceDefinitionStoreInjectable from "../../renderer/components/custom-resource-definitions/store.injectable";
import favoritesStoreInjectable from "../../renderer/components/favorites/store.injectable";
import kubeDetailsUrlParamInjectable from "../../renderer/components/kube-detail-params/kube-details-url.injectable";
import { getApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";

import type { SidebarItemDeclaration } from "@freelensapp/cluster-sidebar";
import type { Logger } from "@freelensapp/logger";

import type { DiContainer } from "@ogre-tools/injectable";
import type { RenderResult } from "@testing-library/react";

import type { KubeApiResource } from "../../common/rbac";
import type { CommandContext } from "../../renderer/components/command-palette/registered-commands/commands";
import type { ApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";
import type { FakeExtensionOptions } from "../../renderer/components/test-utils/get-extension-fake";

const group = "gateway.networking.k8s.io";
const groupItemTestId = `sidebar-item-custom-resource-group-${group}`;
const gatewaysItemTestId = `${groupItemTestId}/gateways`;
const httpRoutesItemTestId = `${groupItemTestId}/httproutes`;

const clusterContext = { entity: { kind: "KubernetesCluster" } } as CommandContext;

const getDefinition = (kind: string, plural: string) =>
  new CustomResourceDefinition({
    apiVersion: "apiextensions.k8s.io/v1",
    kind: "CustomResourceDefinition",
    metadata: {
      name: `${plural}.${group}`,
      selfLink: `/apis/apiextensions.k8s.io/v1/customresourcedefinitions/${plural}.${group}`,
      uid: `${plural}-crd-uid`,
      resourceVersion: "1",
    },
    spec: {
      group,
      scope: "Namespaced",
      names: { kind, plural, singular: kind.toLowerCase() },
      versions: [{ name: "v1", served: true, storage: true }],
    },
  });

const gatewayDefinition = getDefinition("Gateway", "gateways");
const httpRouteDefinition = getDefinition("HTTPRoute", "httproutes");

class Gateway extends LensExtensionKubeObject {
  static readonly kind = "Gateway";
  static readonly namespaced = true;
  static readonly crd = { apiVersions: [`${group}/v1`], plural: "gateways", singular: "gateway" };
}

class HTTPRoute extends LensExtensionKubeObject {
  static readonly kind = "HTTPRoute";
  static readonly namespaced = true;
  static readonly crd = { apiVersions: [`${group}/v1`], plural: "httproutes", singular: "httproute" };
}

// What discovery reports when the list of definitions is refused.
const discoveredResources: KubeApiResource[] = [
  { group, version: "v1", apiName: "gateways", kind: "Gateway", namespaced: true },
  { group, version: "v1", apiName: "httproutes", kind: "HTTPRoute", namespaced: true },
];

const someGateway = new KubeObject({
  apiVersion: `${group}/v1`,
  kind: "Gateway",
  metadata: {
    name: "some-gateway",
    namespace: "default",
    selfLink: `/apis/${group}/v1/namespaces/default/gateways/some-gateway`,
    uid: "some-gateway-uid",
    resourceVersion: "1",
  },
});

const gatewayExtension: FakeExtensionOptions = {
  id: "gateway-extension-id",
  name: "gateway-extension",
  rendererOptions: { customResources: [Gateway] },
};

describe("custom resources an extension presents", () => {
  let builder: ApplicationBuilder;
  let result: RenderResult;
  let windowDi: DiContainer;
  let loggerStub: Logger;

  const getRows = () => result.container.querySelectorAll(".CustomResources .TableRow");

  const findSidebarItem = (id: string) => {
    const find = (items: SidebarItemDeclaration[]): SidebarItemDeclaration | undefined =>
      items.map((item) => (item.id === id ? item : find(item.children))).find(Boolean);

    return find(windowDi.inject(sidebarItemsInjectable).get());
  };

  const enableExtension = (extension: FakeExtensionOptions) =>
    act(async () => {
      builder.extensions.enable(extension);
    });

  beforeEach(async () => {
    builder = getApplicationBuilder();
    builder.setEnvironmentToClusterFrame();

    loggerStub = {
      error: vi.fn(),
      debug: noop,
      info: noop,
      silly: noop,
      warn: noop,
    };

    builder.beforeWindowStart(({ windowDi }) => {
      windowDi.override(loggerInjectionToken, () => loggerStub);
    });

    builder.afterWindowStart(({ windowDi }) => {
      windowDi.inject(customResourceDefinitionStoreInjectable).items.replace([gatewayDefinition, httpRouteDefinition]);
    });

    result = await builder.render();
    windowDi = builder.applicationWindow.only.di;

    builder.allowKubeResource({ group: "apiextensions.k8s.io", apiName: "customresourcedefinitions" });
    builder.allowKubeResource({ group, apiName: "gateways" });
    builder.allowKubeResource({ group, apiName: "httproutes" });
    builder.namespaces.add("default");
    builder.namespaces.select("default");
  });

  describe("given an enabled extension registers one of them in customResources", () => {
    beforeEach(async () => {
      await enableExtension(gatewayExtension);

      // The premise of everything below: the resource is out of the tree.
      await waitFor(() => expect(findSidebarItem(gatewaysItemTestId)?.isHiddenInTree.get()).toBe(true), {
        timeout: 300,
      });
    });

    it("still lists the resource in the command palette", () => {
      const command = windowDi
        .inject(sidebarNavigationCommandsInjectable)
        .get()
        .find(({ id }) => id === `navigation.${gatewaysItemTestId}`);

      expect(command?.title).toBe(`Custom Resources: ${group}: Gateway`);
      expect(command?.isActive?.(clusterContext)).toBe(true);
    });

    describe("when the resource is opened by URL", () => {
      beforeEach(() => {
        windowDi
          .inject(apiManagerInjectable)
          .getStore(gatewayDefinition.getResourceApiBase())
          ?.items.replace([someGateway]);

        act(() => windowDi.inject(navigateToCustomResourcesInjectable)({ group, name: "gateways" }));
      });

      it("shows the host's list of the resource", async () => {
        await waitFor(() => expect(getRows()).toHaveLength(1), { timeout: 300 });
        expect(getRows()[0]).toHaveTextContent("some-gateway");
      });

      describe("when an object of the resource is opened in the details", () => {
        beforeEach(() => {
          act(() => windowDi.inject(kubeDetailsUrlParamInjectable).set(someGateway.selfLink));
        });

        it("shows the host's details of a custom resource", async () => {
          await waitFor(
            () => expect(result.container.querySelector(".CustomResourceDetails.Gateway")).toBeInTheDocument(),
            { timeout: 300 },
          );
        });
      });
    });
  });

  describe("given the user made a favorite of a resource before an extension registered it", () => {
    const favoriteTestId = `favorite-${gatewaysItemTestId}`;

    beforeEach(async () => {
      await waitFor(() => expect(findSidebarItem(gatewaysItemTestId)).toBeDefined(), { timeout: 300 });

      const gatewaysItem = findSidebarItem(gatewaysItemTestId);

      if (!gatewaysItem) {
        throw new Error(`no sidebar item "${gatewaysItemTestId}"`);
      }

      act(() => windowDi.inject(favoritesStoreInjectable).toggle(gatewaysItem, "crd"));

      await enableExtension(gatewayExtension);
      await waitFor(() => expect(findSidebarItem(gatewaysItemTestId)?.isHiddenInTree.get()).toBe(true), {
        timeout: 300,
      });

      await waitFor(() => result.getByTestId("expand-icon-for-sidebar-item-favorites").click(), { timeout: 300 });
    });

    it("keeps the favorite in the Favorites section", () => {
      expect(result.getByTestId(favoriteTestId)).toHaveTextContent("Gateway");
    });

    it("opens the host's list of the resource from the favorite", async () => {
      windowDi
        .inject(apiManagerInjectable)
        .getStore(gatewayDefinition.getResourceApiBase())
        ?.items.replace([someGateway]);

      act(() => result.getByTestId(`link-for-${favoriteTestId}`).click());

      await waitFor(() => expect(getRows()).toHaveLength(1), { timeout: 300 });
      expect(getRows()[0]).toHaveTextContent("some-gateway");
    });

    it("shows the favorite as available in the favorites overview", () => {
      act(() => builder.navigateWith(navigateToFavoritesOverviewInjectable));

      expect(result.getByTestId("page-for-favorites-overview")).not.toHaveTextContent("Not available in this cluster");
    });
  });

  describe("given the user made a favorite of a group before an extension registered every kind of it", () => {
    const favoriteTestId = `favorite-${groupItemTestId}`;

    beforeEach(async () => {
      await waitFor(() => expect(findSidebarItem(groupItemTestId)).toBeDefined(), { timeout: 300 });

      const groupItem = findSidebarItem(groupItemTestId);

      if (!groupItem) {
        throw new Error(`no sidebar item "${groupItemTestId}"`);
      }

      act(() => windowDi.inject(favoritesStoreInjectable).toggle(groupItem, "crd"));

      await enableExtension({
        ...gatewayExtension,
        rendererOptions: { customResources: [Gateway, HTTPRoute] },
      });
      await waitFor(() => expect(findSidebarItem(groupItemTestId)?.isHiddenInTree.get()).toBe(true), {
        timeout: 300,
      });

      await waitFor(() => result.getByTestId("expand-icon-for-sidebar-item-favorites").click(), { timeout: 300 });
      await waitFor(() => result.getByTestId(`expand-icon-for-${favoriteTestId}`).click(), { timeout: 300 });
    });

    it.each([gatewaysItemTestId, httpRoutesItemTestId])("shows %s under the favorite", (testId) => {
      expect(result.getByTestId(favoriteTestId)).toContainElement(result.getByTestId(testId));
    });

    it("opens the host's list of a kind from the favorite", async () => {
      windowDi
        .inject(apiManagerInjectable)
        .getStore(gatewayDefinition.getResourceApiBase())
        ?.items.replace([someGateway]);

      act(() => result.getByTestId(`link-for-${gatewaysItemTestId}`).click());

      await waitFor(() => expect(getRows()).toHaveLength(1), { timeout: 300 });
      expect(getRows()[0]).toHaveTextContent("some-gateway");
    });
  });

  describe("the Custom Resources tree", () => {
    const expandCustomResources = () =>
      waitFor(() => result.getByTestId("expand-icon-for-sidebar-item-custom-resources").click(), { timeout: 300 });

    const expandGroup = () =>
      waitFor(() => result.getByTestId(`expand-icon-for-${groupItemTestId}`).click(), { timeout: 300 });

    describe("given no extension registers the resources", () => {
      beforeEach(async () => {
        await expandCustomResources();
        await expandGroup();
      });

      it.each([gatewaysItemTestId, httpRoutesItemTestId])("shows %s", (testId) => {
        expect(result.getByTestId(testId)).toBeInTheDocument();
      });
    });

    describe("given an enabled extension registers one kind of the group", () => {
      beforeEach(async () => {
        await enableExtension(gatewayExtension);
        await expandCustomResources();
        await expandGroup();
      });

      it("does not show the kind", async () => {
        await waitFor(() => expect(result.queryByTestId(gatewaysItemTestId)).not.toBeInTheDocument(), {
          timeout: 300,
        });
      });

      it("shows the other kind of the group", () => {
        expect(result.getByTestId(httpRoutesItemTestId)).toHaveTextContent("HTTP Route");
      });

      it("keeps the group", () => {
        expect(result.getByTestId(groupItemTestId)).toBeInTheDocument();
      });

      describe("when the extension is disabled", () => {
        beforeEach(() => {
          act(() => builder.extensions.disable(gatewayExtension));
        });

        it("shows the kind again", async () => {
          await waitFor(() => expect(result.getByTestId(gatewaysItemTestId)).toHaveTextContent("Gateway"), {
            timeout: 300,
          });
        });
      });

      describe("when the Definitions list is opened", () => {
        beforeEach(() => {
          act(() => builder.navigateWith(navigateToCustomResourceDefinitionsInjectable));
        });

        it("still lists the definition of the kind", async () => {
          await waitFor(
            () => {
              const rows = Array.from(
                result.container.querySelectorAll(".CustomResourceDefinitions .TableRow"),
                (row) => row.textContent,
              );

              expect(rows).toEqual(
                expect.arrayContaining([expect.stringContaining("Gateway"), expect.stringContaining("HTTPRoute")]),
              );
            },
            { timeout: 300 },
          );
        });
      });
    });

    describe("given an enabled extension registers every kind of the group", () => {
      beforeEach(async () => {
        await enableExtension({
          ...gatewayExtension,
          rendererOptions: { customResources: [Gateway, HTTPRoute] },
        });
        await expandCustomResources();
      });

      it("does not show the group", async () => {
        await waitFor(() => expect(result.queryByTestId(groupItemTestId)).not.toBeInTheDocument(), {
          timeout: 300,
        });
      });

      it("keeps the Definitions item", () => {
        expect(result.getByTestId("sidebar-item-custom-resource-definitions")).toBeInTheDocument();
      });
    });

    describe("given an extension registers an invalid class next to a valid one", () => {
      class HTTPRouteWithoutKind extends LensExtensionKubeObject {
        static readonly crd = HTTPRoute.crd;
      }

      beforeEach(async () => {
        await enableExtension({
          ...gatewayExtension,
          rendererOptions: { customResources: [HTTPRouteWithoutKind, Gateway] },
        });
        await expandCustomResources();
        await expandGroup();
      });

      it("logs the rejection, naming the extension, the entry and the class", () => {
        expect(loggerStub.error).toHaveBeenCalledWith(
          '[EXTENSIONS]: gateway-extension: customResources[0] (HTTPRouteWithoutKind) is rejected: the class has no static "kind"',
        );
      });

      it("keeps the resource of the invalid class in the tree", () => {
        expect(result.getByTestId(httpRoutesItemTestId)).toBeInTheDocument();
      });

      it("still leaves the resource of the valid class out of the tree", async () => {
        await waitFor(() => expect(result.queryByTestId(gatewaysItemTestId)).not.toBeInTheDocument(), {
          timeout: 300,
        });
      });
    });

    describe("given an extension sets customResources to a single class instead of an array", () => {
      beforeEach(async () => {
        await enableExtension({
          ...gatewayExtension,
          rendererOptions: { customResources: Gateway as unknown as [] },
        });
        await expandCustomResources();
        await expandGroup();
      });

      it("logs one error naming the extension and what the field holds", () => {
        expect(loggerStub.error).toHaveBeenCalledTimes(1);
        expect(loggerStub.error).toHaveBeenCalledWith(
          "[EXTENSIONS]: gateway-extension: customResources is rejected: it is not an array but the class Gateway",
        );
      });

      it("registers nothing, so the resource stays in the tree", () => {
        expect(result.getByTestId(gatewaysItemTestId)).toHaveTextContent("Gateway");
      });
    });

    describe("given the list of definitions is refused and the resources are known from discovery", () => {
      beforeEach(async () => {
        const customResourceDefinitionStore = windowDi.inject(customResourceDefinitionStoreInjectable);
        const hostedCluster = windowDi.inject(hostedClusterInjectable);

        if (!hostedCluster) {
          throw new Error("Expected a hosted cluster in the cluster frame");
        }

        hostedCluster.knownResources.replace(discoveredResources);
        vi.spyOn(console, "warn").mockImplementation(() => {});

        await act(async () => {
          customResourceDefinitionStore.items.clear();
          vi.spyOn(customResourceDefinitionStore.api, "list").mockRejectedValue(
            new Error("customresourcedefinitions.apiextensions.k8s.io is forbidden"),
          );
          await customResourceDefinitionStore.loadAll();
        });

        await enableExtension(gatewayExtension);
        await expandCustomResources();
        await expandGroup();
      });

      it("does not show the kind the extension registers", async () => {
        await waitFor(() => expect(result.queryByTestId(gatewaysItemTestId)).not.toBeInTheDocument(), {
          timeout: 300,
        });
      });

      it("shows the other discovered kind of the group", () => {
        expect(result.getByTestId(httpRoutesItemTestId)).toHaveTextContent("HTTP Route");
      });
    });
  });
});
