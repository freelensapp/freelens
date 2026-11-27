/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { Node } from "@freelensapp/kube-object";
import { clusterOverviewUIBlockInjectionToken } from "@freelensapp/metrics";
import { getInjectable } from "@ogre-tools/injectable";
import { act, screen } from "@testing-library/react";
import { computed, observable, runInAction } from "mobx";
import { Cluster } from "../../../common/cluster/cluster";
import { ClusterMetadataKey } from "../../../common/cluster-types";
import requestClusterApiUrlInjectable from "../../../features/cluster/connections/renderer/request-api-url.injectable";
import enabledMetricsInjectable from "../../api/catalog/entity/metrics-enabled.injectable";
import hostedClusterInjectable from "../../cluster-frame-context/hosted-cluster.injectable";
import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import subscribeStoresInjectable from "../../kube-watch-api/subscribe-stores.injectable";
import eventStoreInjectable from "../events/store.injectable";
import nodeStoreInjectable from "../nodes/store.injectable";
import { renderFor } from "../test-utils/renderFor";
import podStoreInjectable from "../workloads-pods/store.injectable";
import { ClusterInfoStrip } from "./cluster-info-strip";
import { ClusterOverview } from "./cluster-overview";

import type { NodeSystemInfo } from "@freelensapp/kube-object";

import type { DiContainer } from "@ogre-tools/injectable";
import type { IObservableArray } from "mobx";
import type { Mock } from "vitest";

import type { RequestClusterApiUrl } from "../../../features/cluster/connections/renderer/request-api-url.injectable";
import type { DiRender } from "../test-utils/renderFor";

vi.mock("./cluster-issues", () => ({
  ClusterIssues: () => <div data-testid="cluster-issues" />,
}));

const metricsBlockInjectable = getInjectable({
  id: "some-cluster-overview-metrics-block",
  instantiate: () => ({
    id: "some-metrics-block",
    Component: () => <div data-testid="cluster-metrics" />,
    orderNumber: 1,
  }),
  injectionToken: clusterOverviewUIBlockInjectionToken,
});

const node = (
  name: string,
  kubeletVersion: string,
  labels: Record<string, string> = {},
  ready: "True" | "False" = "True",
) =>
  new Node({
    apiVersion: "v1",
    kind: "Node",
    metadata: { name, uid: `${name}-uid`, resourceVersion: "1", selfLink: `/api/v1/nodes/${name}`, labels },
    status: {
      conditions: [{ type: "Ready", status: ready }],
      nodeInfo: {
        kubeletVersion,
        osImage: "Ubuntu 24.04.1 LTS",
        operatingSystem: "linux",
        architecture: "amd64",
        containerRuntimeVersion: "containerd://1.7.22",
      } as NodeSystemInfo,
    },
  });

describe("ClusterInfoStrip", () => {
  let di: DiContainer;
  let render: DiRender;
  let nodes: IObservableArray<Node>;
  let cluster: Cluster;
  let resolveApiUrl: (url: string | undefined) => void;
  let requestClusterApiUrl: Mock<RequestClusterApiUrl>;

  beforeEach(() => {
    di = getDiForUnitTesting();
    render = renderFor(di);
    nodes = observable.array([
      node("control-plane", "v1.31.2", { "node-role.kubernetes.io/control-plane": "" }),
      node("worker-1", "v1.31.2"),
      node("worker-2", "v1.31.2", {}, "False"),
    ]);
    cluster = new Cluster({
      id: "some-cluster-id",
      contextName: "some-context",
      kubeConfigPath: "/some/kubeconfig",
      metadata: {
        [ClusterMetadataKey.VERSION]: "v1.31.2",
        [ClusterMetadataKey.DISTRIBUTION]: "k3s",
      },
    });
    requestClusterApiUrl = vi.fn<RequestClusterApiUrl>(
      () =>
        new Promise<string | undefined>((resolve) => {
          resolveApiUrl = resolve;
        }),
    );

    di.override(hostedClusterInjectable, () => cluster);
    di.override(requestClusterApiUrlInjectable, () => requestClusterApiUrl);
    di.override(nodeStoreInjectable, () => ({ isLoaded: true, items: nodes }) as never);
  });

  const fact = (name: string) => screen.getByTestId(`cluster-info-${name}`);

  describe("when rendered", () => {
    beforeEach(() => {
      render(<ClusterInfoStrip />);
    });

    it("shows the cluster's version, distribution and context", () => {
      expect(fact("version")).toHaveTextContent("Kubernetesv1.31.2");
      expect(fact("distribution")).toHaveTextContent("Distributionk3s");
      expect(fact("context")).toHaveTextContent("Contextsome-context");
    });

    it("asks main for the API server of the cluster", () => {
      expect(requestClusterApiUrl).toHaveBeenCalledWith("some-cluster-id");
    });

    it("shows that the API server is loading", () => {
      expect(fact("api-server")).toHaveTextContent("API server…");
    });

    it("shows the API server once main answers", async () => {
      await act(async () => resolveApiUrl("https://10.0.0.1:6443"));

      expect(fact("api-server")).toHaveTextContent("API serverhttps://10.0.0.1:6443");
    });

    it("shows an unknown API server when main has none", async () => {
      await act(async () => resolveApiUrl(undefined));

      expect(fact("api-server")).toHaveTextContent("API serverunknown");
    });

    it("counts the ready nodes", () => {
      expect(fact("nodes-ready")).toHaveTextContent("Nodes ready2 / 3");
    });

    it("counts the control plane and worker nodes", () => {
      expect(fact("roles")).toHaveTextContent("Roles1 control plane, 2 workers");
    });

    it("shows the kubelet version, system, platform and runtime", () => {
      expect(fact("kubelet")).toHaveTextContent("Kubeletv1.31.2");
      expect(fact("os")).toHaveTextContent("OSUbuntu 24.04.1 LTS");
      expect(fact("platform")).toHaveTextContent("Platformlinux/amd64");
      expect(fact("runtime")).toHaveTextContent("Runtimecontainerd://1.7.22");
    });

    it("shows no kubelet warning while the versions agree", () => {
      expect(screen.queryByTestId("cluster-info-kubelet-warning")).not.toBeInTheDocument();
    });

    describe("when a node joins with a newer kubelet", () => {
      beforeEach(() => {
        act(() => {
          nodes.push(node("worker-3", "v1.32.0"));
        });
      });

      it("lists each version with its number of nodes", () => {
        expect(fact("kubelet")).toHaveTextContent(/v1\.31\.2 \(3\), v1\.32\.0 \(1\)$/);
      });

      it("warns about the skew", () => {
        expect(screen.getByTestId("cluster-info-kubelet-warning")).toHaveAttribute(
          "aria-label",
          "The nodes run different kubelet versions. Kubelet v1.32.0 is newer than the API server (v1.31.2), which is not supported.",
        );
      });
    });
  });

  describe("when the cluster has no metadata yet", () => {
    beforeEach(() => {
      cluster = new Cluster({ id: "some-cluster-id", contextName: "some-context", kubeConfigPath: "/some/kubeconfig" });
      nodes.replace([node("worker-1", "v1.40.0")]);
      render(<ClusterInfoStrip />);
    });

    it("shows the version and the distribution as unknown", () => {
      expect(fact("version")).toHaveTextContent("Kubernetesunknown");
      expect(fact("distribution")).toHaveTextContent("Distributionunknown");
    });

    it("judges no kubelet against the unknown version", () => {
      expect(screen.queryByTestId("cluster-info-kubelet-warning")).not.toBeInTheDocument();
    });
  });

  describe("when there is no hosted cluster", () => {
    beforeEach(() => {
      di.override(hostedClusterInjectable, () => undefined);
      render(<ClusterInfoStrip />);
    });

    it("shows the cluster facts as unknown", () => {
      expect(fact("version")).toHaveTextContent("Kubernetesunknown");
      expect(fact("distribution")).toHaveTextContent("Distributionunknown");
      expect(fact("api-server")).toHaveTextContent("API serverunknown");
      expect(fact("context")).toHaveTextContent("Contextunknown");
    });

    it("does not ask main for an API server", () => {
      expect(requestClusterApiUrl).not.toHaveBeenCalled();
    });
  });

  describe("when no node reports its system", () => {
    beforeEach(() => {
      nodes.replace([
        new Node({
          apiVersion: "v1",
          kind: "Node",
          metadata: { name: "bare", uid: "bare-uid", resourceVersion: "1", selfLink: "/api/v1/nodes/bare" },
        }),
      ]);
      render(<ClusterInfoStrip />);
    });

    it("shows the node facts as unknown", () => {
      expect(fact("nodes-ready")).toHaveTextContent("Nodes ready0 / 1");
      expect(fact("kubelet")).toHaveTextContent("Kubeletunknown");
      expect(fact("os")).toHaveTextContent("OSunknown");
      expect(fact("platform")).toHaveTextContent("Platformunknown");
      expect(fact("runtime")).toHaveTextContent("Runtimeunknown");
    });
  });

  describe("in the cluster overview", () => {
    let metricsVisible: ReturnType<typeof observable.box<boolean>>;

    beforeEach(() => {
      metricsVisible = observable.box(true);

      di.override(eventStoreInjectable, () => ({ isLoaded: true }) as never);
      di.override(podStoreInjectable, () => ({}) as never);
      di.override(subscribeStoresInjectable, () => () => () => {});
      di.override(enabledMetricsInjectable, () => computed(() => metricsVisible.get()));
      runInAction(() => di.register(metricsBlockInjectable));
    });

    it("comes above the metrics when metrics are shown", () => {
      render(<ClusterOverview />);

      const page = screen.getByTestId("cluster-overview-page");

      expect(page.previousElementSibling).toBe(screen.getByTestId("cluster-info-strip"));
      expect(screen.getByTestId("cluster-metrics")).toBeInTheDocument();
      expect(screen.getByTestId("cluster-issues")).toBeInTheDocument();
    });

    it("comes above the cluster issues when metrics are hidden", () => {
      metricsVisible.set(false);
      render(<ClusterOverview />);

      const page = screen.getByTestId("cluster-overview-page");

      expect(page.previousElementSibling).toBe(screen.getByTestId("cluster-info-strip"));
      expect(screen.queryByTestId("cluster-metrics")).not.toBeInTheDocument();
      expect(screen.getByTestId("cluster-issues")).toBeInTheDocument();
    });

    it("is not shown while the nodes load", () => {
      di.override(nodeStoreInjectable, () => ({ isLoaded: false, items: [] }) as never);
      render(<ClusterOverview />);

      expect(screen.queryByTestId("cluster-info-strip")).not.toBeInTheDocument();
    });
  });
});
