/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { podMetricsApiInjectable } from "@freelensapp/kube-api-specifics";
import { Pod } from "@freelensapp/kube-object";
import { observableHistoryInjectionToken } from "@freelensapp/routing";
import { act, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import navigateToPodsInjectable from "../../../common/front-end-routing/routes/cluster/workloads/pods/navigate-to-pods.injectable";
import requestMetricsInjectable from "../../../common/k8s-api/endpoints/metrics.api/request-metrics.injectable";
import namespaceStoreInjectable from "../../../renderer/components/namespaces/store.injectable";
import {
  type ApplicationBuilder,
  getApplicationBuilder,
} from "../../../renderer/components/test-utils/get-application-builder";
import navigateToPodsOnNodeInjectable from "../../../renderer/components/workloads-pods/navigate-to-pods-on-node.injectable";
import podStoreInjectable from "../../../renderer/components/workloads-pods/store.injectable";

import type { PodMetricsApi } from "@freelensapp/kube-api";
import type { PodMetrics, PodStatus } from "@freelensapp/kube-object";

import type { DiContainer } from "@ogre-tools/injectable";
import type { RenderResult } from "@testing-library/react";

import type { RequestMetrics } from "../../../common/k8s-api/endpoints/metrics.api/request-metrics.injectable";

describe("workloads / pods", () => {
  let rendered: RenderResult;
  let applicationBuilder: ApplicationBuilder;
  const podMetrics: PodMetrics[] = [];

  beforeEach(() => {
    applicationBuilder = getApplicationBuilder().setEnvironmentToClusterFrame();
    applicationBuilder.namespaces.add("default");
    applicationBuilder.beforeWindowStart(({ windowDi }) => {
      windowDi.override(
        podMetricsApiInjectable,
        () =>
          ({
            list: async () => Promise.resolve(podMetrics),
          }) as PodMetricsApi,
      );
    });
    applicationBuilder.afterWindowStart(() => {
      applicationBuilder.allowKubeResource({
        apiName: "pods",
        group: "",
      });
    });
  });

  describe("when navigating to workloads / pods view", () => {
    describe("given pods are loading", () => {
      beforeEach(async () => {
        applicationBuilder.afterWindowStart(({ windowDi }) => {
          const podStore = windowDi.inject(podStoreInjectable);

          podStore.items.clear();
          podStore.isLoaded = false;
          podStore.isLoading = true;
        });

        rendered = await applicationBuilder.render();
        applicationBuilder.navigateWith(navigateToPodsInjectable);
      });

      it("renders", () => {
        expect(rendered.baseElement).toMatchSnapshot();
      });

      it("shows loading spinner", async () => {
        expect(await rendered.findByTestId("kube-object-list-layout-spinner")).toBeInTheDocument();
      });
    });

    describe("given no pods", () => {
      beforeEach(async () => {
        applicationBuilder.afterWindowStart(({ windowDi }) => {
          const podStore = windowDi.inject(podStoreInjectable);

          podStore.items.clear();
          podStore.isLoaded = true;
        });

        rendered = await applicationBuilder.render();
        applicationBuilder.navigateWith(navigateToPodsInjectable);
      });

      it("renders", () => {
        expect(rendered.baseElement).toMatchSnapshot();
      });

      it("shows item list is empty", () => {
        expect(rendered.getByText("Item list is empty")).toBeInTheDocument();
      });
    });

    describe("given a namespace has pods", () => {
      beforeEach(async () => {
        applicationBuilder.afterWindowStart(({ windowDi }) => {
          windowDi.override(requestMetricsInjectable, () => (() => Promise.resolve({})) as unknown as RequestMetrics);

          const podStore = windowDi.inject(podStoreInjectable);

          podStore.items.push(
            new Pod({
              apiVersion: "v1",
              kind: "Pod",
              metadata: {
                name: "test-pod-1",
                namespace: "default",
                resourceVersion: "irrelevant",
                selfLink: "/api/v1/namespaces/default/pods/test-pod-1",
                uid: "uuid-1",
              },
              spec: {
                containers: [
                  {
                    name: "container-1",
                  },
                  {
                    name: "container-2",
                  },
                ],
              },
              status: {} as PodStatus,
            }),
          );
          podStore.isLoaded = true;
        });

        rendered = await applicationBuilder.render();
        applicationBuilder.navigateWith(navigateToPodsInjectable);
      });

      it("renders", () => {
        expect(rendered.baseElement).toMatchSnapshot();
      });

      it("renders the pod list", async () => {
        expect(
          await rendered.findByTestId(`icon-for-menu-actions-for-kube-object-menu-for-uuid-1`),
        ).toBeInTheDocument();
      });
    });

    describe("given pods on different nodes in different namespaces", () => {
      let windowDi: DiContainer;

      const makePod = (name: string, namespace: string, nodeName?: string) =>
        new Pod({
          apiVersion: "v1",
          kind: "Pod",
          metadata: {
            name,
            namespace,
            resourceVersion: "irrelevant",
            selfLink: `/api/v1/namespaces/${namespace}/pods/${name}`,
            uid: `uid-${name}`,
          },
          spec: {
            containers: [{ name: "container" }],
            nodeName,
          },
          status: {} as PodStatus,
        });

      const rowOf = (name: string) =>
        rendered.queryByTestId(`icon-for-menu-actions-for-kube-object-menu-for-uid-${name}`);

      beforeEach(async () => {
        applicationBuilder.namespaces.add("kube-system");
        applicationBuilder.afterWindowStart((windowStart) => {
          windowDi = windowStart.windowDi;
          windowDi.override(requestMetricsInjectable, () => (() => Promise.resolve({})) as unknown as RequestMetrics);

          const podStore = windowDi.inject(podStoreInjectable);

          podStore.items.push(
            makePod("on-a", "default", "node-a"),
            makePod("on-b", "default", "node-b"),
            makePod("system-on-a", "kube-system", "node-a"),
            makePod("pending", "default"),
          );
          podStore.isLoaded = true;
        });

        rendered = await applicationBuilder.render();
        applicationBuilder.namespaces.select("default");
      });

      describe("when navigating to the pods of a node", () => {
        beforeEach(async () => {
          expect(windowDi.inject(namespaceStoreInjectable).areAllSelectedImplicitly).toBe(false);
          act(() => windowDi.inject(navigateToPodsOnNodeInjectable)("node-a"));
          await rendered.findByTestId("icon-for-menu-actions-for-kube-object-menu-for-uid-on-a");
        });

        it("puts the node into the URL", () => {
          expect(windowDi.inject(observableHistoryInjectionToken).searchParams.get("node")).toBe("node-a");
        });

        it("selects all namespaces", () => {
          expect(windowDi.inject(namespaceStoreInjectable).areAllSelectedImplicitly).toBe(true);
        });

        it("shows only the pods on the node, of every namespace", () => {
          expect(rowOf("on-a")).toBeInTheDocument();
          expect(rowOf("system-on-a")).toBeInTheDocument();
          expect(rowOf("on-b")).not.toBeInTheDocument();
          expect(rowOf("pending")).not.toBeInTheDocument();
        });

        it("tells that the list is filtered", () => {
          expect(rendered.getByText("Filtered")).toBeInTheDocument();
        });

        describe("when the node filter is removed", () => {
          beforeEach(async () => {
            fireEvent.click(rendered.getByText("Filtered"));

            const badge = rendered.container.querySelector(".PageFiltersList .Badge.node");

            expect(badge).toHaveTextContent("node-a");
            fireEvent.click(badge!.querySelector(".Icon.material")!);
            await rendered.findByTestId("icon-for-menu-actions-for-kube-object-menu-for-uid-on-b");
          });

          it("shows the pods on every node again", () => {
            expect(rowOf("on-a")).toBeInTheDocument();
            expect(rowOf("on-b")).toBeInTheDocument();
            expect(rowOf("pending")).toBeInTheDocument();
          });

          it("removes the node from the URL", () => {
            expect(windowDi.inject(observableHistoryInjectionToken).searchParams.has("node")).toBe(false);
          });
        });
      });

      describe("when navigating to the pods list without a node", () => {
        beforeEach(async () => {
          applicationBuilder.navigateWith(navigateToPodsInjectable);
          await rendered.findByTestId("icon-for-menu-actions-for-kube-object-menu-for-uid-on-a");
        });

        it("shows the pods on every node", () => {
          expect(rowOf("on-b")).toBeInTheDocument();
          expect(rowOf("pending")).toBeInTheDocument();
        });
      });
    });
  });
});
