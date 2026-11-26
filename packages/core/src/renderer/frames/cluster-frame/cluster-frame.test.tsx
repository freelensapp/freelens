/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { DiContextProvider } from "@ogre-tools/injectable-react";
import { act, render as testingLibraryRender } from "@testing-library/react";
import { computed } from "mobx";
import { beforeEach, describe, expect, it, vi } from "vitest";
import directoryForUserDataInjectable from "../../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import { KubernetesCluster } from "../../../common/catalog-entities";
import { Cluster } from "../../../common/cluster/cluster";
import extensionInjectable from "../../../extensions/extension-loader/extension/extension.injectable";
import { getClusterPageMenuOrderInjectable } from "../../../features/user-preferences/common/cluster-page-menu-order.injectable";
import { testUsingFakeTime } from "../../../test-utils/use-fake-time";
import activeKubernetesClusterInjectable from "../../cluster-frame-context/active-kubernetes-cluster.injectable";
import hostedClusterInjectable from "../../cluster-frame-context/hosted-cluster.injectable";
import hostedClusterIdInjectable from "../../cluster-frame-context/hosted-cluster-id.injectable";
import { getExtensionFakeForRenderer } from "../../components/test-utils/get-extension-fake";
import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import legacyOnChannelListenInjectable from "../../ipc/legacy-channel-listen.injectable";
import subscribeStoresInjectable from "../../kube-watch-api/subscribe-stores.injectable";
import { DefaultProps } from "../../mui-base-theme";
import currentRouteComponentInjectable from "../../routes/current-route-component.injectable";
import currentlyInClusterFrameInjectable from "../../routes/currently-in-cluster-frame.injectable";
import storesAndApisCanBeCreatedInjectable from "../../stores-apis-can-be-created.injectable";
import { ClusterFrame } from "./cluster-frame";

import type { DiContainer } from "@ogre-tools/injectable";
import type { RenderResult } from "@testing-library/react";

describe("<ClusterFrame />", () => {
  let render: () => RenderResult;
  let di: DiContainer;
  let cluster: Cluster;

  beforeEach(() => {
    di = getDiForUnitTesting();
    render = () => testingLibraryRender(<DiContextProvider value={di}>{DefaultProps(ClusterFrame)}</DiContextProvider>);

    di.override(subscribeStoresInjectable, () => vi.fn().mockImplementation(() => vi.fn()));
    di.override(legacyOnChannelListenInjectable, () => vi.fn().mockImplementation(() => vi.fn()));
    di.override(directoryForUserDataInjectable, () => "/some/irrelavent/path");
    di.override(storesAndApisCanBeCreatedInjectable, () => true);
    di.override(currentlyInClusterFrameInjectable, () => true);
    di.override(getClusterPageMenuOrderInjectable, () => (key: string, defaultValue: number) => {
      return computed(() => defaultValue);
    });

    testUsingFakeTime("2000-01-01 12:00:00am");

    cluster = new Cluster({
      contextName: "my-cluster",
      id: "123456",
      kubeConfigPath: "/irrelavent",
    });

    di.override(hostedClusterInjectable, () => cluster);
    di.override(hostedClusterIdInjectable, () => cluster.id);
  });

  describe("given cluster with list nodes and namespaces permissions", () => {
    beforeEach(() => {
      cluster.resourcesToShow.replace(["nodes", "namespaces"]);
    });

    it("renders", () => {
      const result = render();

      expect(result.container).toMatchSnapshot();
    });

    it("shows cluster overview sidebar item as active", () => {
      const result = render();
      const clusterOverviewSidebarItem = result.getByTestId("sidebar-item-cluster-overview");

      expect(clusterOverviewSidebarItem.getAttribute("data-is-active-test")).toBe("true");
    });

    describe("given no matching component", () => {
      beforeEach(() => {
        di.override(currentRouteComponentInjectable, () => computed(() => undefined));
      });

      describe("given current url is starting url", () => {
        it("renders", () => {
          const result = render();

          expect(result.container).toMatchSnapshot();
        });

        it("shows warning message", () => {
          const result = render();

          expect(
            result.getByText(
              "An error has occurred. No route can be found matching the current route, which is also the starting route.",
            ),
          ).toBeInTheDocument();
        });
      });
    });
  });

  describe("given cluster without list nodes, but with namespaces permissions", () => {
    beforeEach(() => {
      cluster.resourcesToShow.replace(["namespaces"]);
    });

    it("renders", () => {
      const result = render();

      expect(result.container).toMatchSnapshot();
    });

    it("shows workloads overview sidebar item as active", () => {
      const result = render();
      const workloadsOverviewSidebarItem = result.getByTestId("sidebar-item-workloads");

      expect(workloadsOverviewSidebarItem.getAttribute("data-is-active-test")).toBe("true");
    });
  });

  it("preserves truthy and falsy legacy extension results in the cluster sidebar", async () => {
    const clusterEntity = new KubernetesCluster({
      metadata: { uid: cluster.id, name: "my-cluster", source: "local", labels: {} },
      spec: { kubeconfigPath: "", kubeconfigContext: "" },
      status: { phase: "connected" },
    });
    di.override(activeKubernetesClusterInjectable, () => computed(() => clusterEntity));
    cluster.resourcesToShow.replace(["nodes", "namespaces"]);

    const fixtures = [
      { id: "enabled", value: true, visible: true },
      { id: "truthy", value: "yes", visible: true },
      { id: "disabled", value: false, visible: false },
      { id: "falsy", value: "", visible: false },
    ].map(({ id, value, visible }) => {
      const title = `Extension sidebar ${id}`;
      const extension = getExtensionFakeForRenderer({
        id: `/${id}/package.json`,
        name: `sidebar-${id}`,
        rendererOptions: { clusterPageMenus: [{ title, components: {} }] },
      });
      // JavaScript extensions can return values outside the SDK's boolean type.
      const eligibility = vi.spyOn(extension, "isEnabledForCluster").mockResolvedValue(value as boolean);
      const registration = di.inject(extensionInjectable, extension);

      return { extension, registration, eligibility, title, visible };
    });

    try {
      for (const { extension, registration } of fixtures) {
        registration.register();
        await extension.enable();
      }

      const result = render();

      await act(async () => vi.advanceTimersByTimeAsync(0));

      for (const { eligibility, title, visible } of fixtures) {
        expect(eligibility).toHaveBeenCalledWith(clusterEntity);

        if (visible) {
          expect(result.getByText(title)).toBeVisible();
        } else {
          expect(result.queryByText(title)).not.toBeInTheDocument();
        }
      }
    } finally {
      act(() => fixtures.forEach(({ registration }) => registration.deregister()));
    }
  });
});
