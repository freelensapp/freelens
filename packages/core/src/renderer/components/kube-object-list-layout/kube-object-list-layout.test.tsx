/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DiContainer } from "@ogre-tools/injectable";
import "@testing-library/jest-dom/vitest";

import { Pod } from "@freelensapp/kube-object";
import { podListLayoutColumnInjectionToken } from "@freelensapp/list-layout";
import appPathsStateInjectable from "../../../common/app-paths/app-paths-state.injectable";
import directoryForKubeConfigsInjectable from "../../../common/app-paths/directory-for-kube-configs/directory-for-kube-configs.injectable";
import directoryForUserDataInjectable from "../../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import { Cluster } from "../../../common/cluster/cluster";
import addCustomTableColumnInjectable from "../../../features/custom-table-columns/common/add-custom-table-column.injectable";
import isTableColumnHiddenInjectable from "../../../features/user-preferences/common/is-table-column-hidden.injectable";
import hostedClusterInjectable from "../../cluster-frame-context/hosted-cluster.injectable";
import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import subscribeStoresInjectable from "../../kube-watch-api/subscribe-stores.injectable";
import storesAndApisCanBeCreatedInjectable from "../../stores-apis-can-be-created.injectable";
import kubeSelectedUrlParamInjectable from "../kube-detail-params/kube-selected-url.injectable";
import toggleKubeDetailsPaneInjectable from "../kube-detail-params/toggle-details.injectable";
import { renderFor } from "../test-utils/renderFor";
import podStoreInjectable from "../workloads-pods/store.injectable";
import { KubeObjectListLayout } from "./index";

import type { RenderResult } from "@testing-library/react";

import type { DiRender } from "../test-utils/renderFor";
import type { PodStore } from "../workloads-pods/store";

describe("kube-object-list-layout", () => {
  let di: DiContainer;
  let render: DiRender;
  let podStore: PodStore;

  beforeEach(() => {
    di = getDiForUnitTesting();

    di.override(directoryForUserDataInjectable, () => "/some-user-store-path");
    di.override(directoryForKubeConfigsInjectable, () => "/some-kube-configs");
    di.override(storesAndApisCanBeCreatedInjectable, () => true);
    di.override(isTableColumnHiddenInjectable, () => () => false);

    di.override(
      hostedClusterInjectable,
      () =>
        new Cluster({
          contextName: "some-context-name",
          id: "some-cluster-id",
          kubeConfigPath: "/some-path-to-a-kubeconfig",
        }),
    );

    render = renderFor(di);

    di.override(subscribeStoresInjectable, () => vi.fn().mockImplementation(() => vi.fn()));
    di.override(kubeSelectedUrlParamInjectable, () => ({
      get: () => "path",
    }));
    di.override(toggleKubeDetailsPaneInjectable, () => null);
    di.override(appPathsStateInjectable, () => ({
      get: () => ({}),
    }));

    podStore = di.inject(podStoreInjectable);
  });

  describe("given pod store", () => {
    let result: RenderResult;

    it("renders", () => {
      result = render(
        <div>
          <KubeObjectListLayout
            className="Pods"
            store={podStore}
            tableId="workloads_pods"
            isConfigurable
            renderHeaderTitle="Pods"
            renderTableContents={(pod) => [<div key={pod.getName()}>{pod.getName()}</div>]}
            columns={di.injectMany(podListLayoutColumnInjectionToken)}
          />
        </div>,
      );

      expect(result.baseElement).toMatchSnapshot();
    });

    describe("given a custom column for pods", () => {
      beforeEach(() => {
        const pod = new Pod({
          apiVersion: "v1",
          kind: "Pod",
          metadata: {
            name: "some-pod",
            namespace: "default",
            resourceVersion: "1",
            selfLink: "/api/v1/namespaces/default/pods/some-pod",
            uid: "some-pod-uid",
            labels: {
              "app.kubernetes.io/instance": "some-instance",
            },
          },
        });

        di.inject(addCustomTableColumnInjectable)({
          kind: "Pod",
          apiVersion: "v1",
          title: "Instance",
          jsonPath: ".metadata.labels['app.kubernetes.io/instance']",
        });

        result = render(
          <div>
            <KubeObjectListLayout
              className="Pods"
              store={podStore}
              items={[pod]}
              isReady
              virtual={false}
              tableId="workloads_pods"
              isConfigurable
              renderHeaderTitle="Pods"
              renderTableHeader={[]}
              renderTableContents={() => []}
              columns={di.injectMany(podListLayoutColumnInjectionToken)}
            />
          </div>,
        );
      });

      it("shows the column header", () => {
        expect(result.getByText("Instance")).toBeInTheDocument();
      });

      it("shows the value of the json path for each item", () => {
        // The cell renders the value and, for the tooltip, a copy of it.
        expect(result.getAllByText("some-instance").length).toBeGreaterThan(0);
      });
    });

    describe("given resourcename", () => {
      it("uses resourcename in search placeholder", () => {
        result = render(
          <div>
            <KubeObjectListLayout
              className="Pods"
              store={podStore}
              tableId="workloads_pods"
              isConfigurable
              renderHeaderTitle="Pods"
              renderTableContents={(pod) => [<div key={pod.getName()}>{pod.getName()}</div>]}
              resourceName="My Custom Items"
              searchFilters={[() => null]}
            />
          </div>,
        );

        expect(result.getByPlaceholderText("Search My Custom Items...")).toBeInTheDocument();
      });
    });
  });
});
