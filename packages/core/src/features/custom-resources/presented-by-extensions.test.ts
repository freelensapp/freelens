/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { sidebarItemsInjectable } from "@freelensapp/cluster-sidebar";
import { CustomResourceDefinition, KubeObject } from "@freelensapp/kube-object";
import { act, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import navigateToCustomResourcesInjectable from "../../common/front-end-routing/routes/cluster/custom-resources/navigate-to-custom-resources.injectable";
import apiManagerInjectable from "../../common/k8s-api/api-manager/manager.injectable";
import { LensExtensionKubeObject } from "../../extensions/common-api/k8s-api";
import sidebarNavigationCommandsInjectable from "../../renderer/components/command-palette/registered-commands/sidebar-navigation-commands.injectable";
import customResourceDefinitionStoreInjectable from "../../renderer/components/custom-resource-definitions/store.injectable";
import kubeDetailsUrlParamInjectable from "../../renderer/components/kube-detail-params/kube-details-url.injectable";
import { getApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";

import type { SidebarItemDeclaration } from "@freelensapp/cluster-sidebar";

import type { DiContainer } from "@ogre-tools/injectable";
import type { RenderResult } from "@testing-library/react";

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
});
