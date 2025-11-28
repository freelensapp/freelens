/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { observable, reaction } from "mobx";
import { KubernetesCluster, LensKubernetesClusterStatus } from "../../../common/catalog-entities/kubernetes-cluster";
import { ClusterConnectionStatus } from "../../../extensions/common-api/cluster-types";
import catalogEntityRegistryInjectable from "../../catalog/entity-registry.injectable";
import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import clusterEnumerationInjectable from "../cluster-enumeration.injectable";

import type { ClusterEnumeration } from "../../../features/cluster/enumeration/common";
import type { CatalogEntityRegistry } from "../../catalog/entity-registry";

function createTestCluster(options: {
  id: string;
  name: string;
  status?: LensKubernetesClusterStatus;
  labels?: Record<string, string>;
  kubeConfigPath?: string;
  contextName?: string;
  distro?: string;
  kubeVersion?: string;
}): KubernetesCluster {
  return new KubernetesCluster({
    metadata: {
      uid: options.id,
      name: options.name,
      source: "test",
      labels: options.labels ?? {},
      distro: options.distro,
      kubeVersion: options.kubeVersion,
    },
    spec: {
      kubeconfigPath: options.kubeConfigPath ?? `/home/user/.kube/config-${options.id}`,
      kubeconfigContext: options.contextName ?? `context-${options.id}`,
    },
    status: {
      phase: options.status ?? LensKubernetesClusterStatus.DISCONNECTED,
    },
  });
}

describe("ClusterEnumeration", () => {
  let clusterEnumeration: ClusterEnumeration;
  let entityRegistry: CatalogEntityRegistry;

  beforeEach(() => {
    const di = getDiForUnitTesting();

    entityRegistry = di.inject(catalogEntityRegistryInjectable);
    clusterEnumeration = di.inject(clusterEnumerationInjectable);
  });

  describe("clusters", () => {
    it("returns empty array when no clusters exist", () => {
      expect(clusterEnumeration.clusters).toEqual([]);
    });

    it("returns ClusterInfo for each KubernetesCluster entity", () => {
      const source = observable.array<KubernetesCluster>([]);
      entityRegistry.addObservableSource("test-clusters", source);

      source.push(
        createTestCluster({
          id: "cluster-1",
          name: "Production Cluster",
          status: LensKubernetesClusterStatus.CONNECTED,
        }),
      );

      expect(clusterEnumeration.clusters.length).toBe(1);

      const cluster = clusterEnumeration.clusters[0];
      expect(cluster.id).toBe("cluster-1");
      expect(cluster.name).toBe("Production Cluster");
      expect(cluster.status).toBe(ClusterConnectionStatus.CONNECTED);
    });

    it("maps multiple clusters", () => {
      const source = observable.array<KubernetesCluster>([
        createTestCluster({ id: "cluster-1", name: "Cluster One", status: LensKubernetesClusterStatus.CONNECTED }),
        createTestCluster({ id: "cluster-2", name: "Cluster Two", status: LensKubernetesClusterStatus.DISCONNECTED }),
        createTestCluster({ id: "cluster-3", name: "Cluster Three", status: LensKubernetesClusterStatus.CONNECTING }),
      ]);

      entityRegistry.addObservableSource("test-clusters", source);

      expect(clusterEnumeration.clusters.length).toBe(3);

      const ids = clusterEnumeration.clusters.map((c) => c.id);
      expect(ids).toContain("cluster-1");
      expect(ids).toContain("cluster-2");
      expect(ids).toContain("cluster-3");
    });

    it("updates reactively when clusters change", (done) => {
      const source = observable.array<KubernetesCluster>([]);
      entityRegistry.addObservableSource("test-clusters", source);

      expect(clusterEnumeration.clusters.length).toBe(0);

      reaction(
        () => clusterEnumeration.clusters.length,
        (length) => {
          if (length === 1) {
            done();
          }
        },
      );

      source.push(createTestCluster({ id: "new-cluster", name: "New Cluster" }));
    });
  });

  describe("status mapping", () => {
    it("maps CONNECTED status", () => {
      const source = observable.array([
        createTestCluster({ id: "c1", name: "Connected", status: LensKubernetesClusterStatus.CONNECTED }),
      ]);
      entityRegistry.addObservableSource("test", source);

      expect(clusterEnumeration.clusters[0].status).toBe(ClusterConnectionStatus.CONNECTED);
    });

    it("maps CONNECTING status", () => {
      const source = observable.array([
        createTestCluster({ id: "c1", name: "Connecting", status: LensKubernetesClusterStatus.CONNECTING }),
      ]);
      entityRegistry.addObservableSource("test", source);

      expect(clusterEnumeration.clusters[0].status).toBe(ClusterConnectionStatus.CONNECTING);
    });

    it("maps DISCONNECTED status", () => {
      const source = observable.array([
        createTestCluster({ id: "c1", name: "Disconnected", status: LensKubernetesClusterStatus.DISCONNECTED }),
      ]);
      entityRegistry.addObservableSource("test", source);

      expect(clusterEnumeration.clusters[0].status).toBe(ClusterConnectionStatus.DISCONNECTED);
    });

    it("maps DELETING to DISCONNECTING", () => {
      const source = observable.array([
        createTestCluster({ id: "c1", name: "Deleting", status: LensKubernetesClusterStatus.DELETING }),
      ]);
      entityRegistry.addObservableSource("test", source);

      expect(clusterEnumeration.clusters[0].status).toBe(ClusterConnectionStatus.DISCONNECTING);
    });

    it("defaults to DISCONNECTED for unknown status", () => {
      const cluster = createTestCluster({ id: "c1", name: "Unknown Status" });
      cluster.status.phase = "unknown" as LensKubernetesClusterStatus;

      const source = observable.array([cluster]);
      entityRegistry.addObservableSource("test", source);

      expect(clusterEnumeration.clusters[0].status).toBe(ClusterConnectionStatus.DISCONNECTED);
    });
  });

  describe("ClusterInfo fields", () => {
    it("maps all required fields", () => {
      const source = observable.array([
        createTestCluster({
          id: "test-cluster",
          name: "Test Cluster",
          status: LensKubernetesClusterStatus.CONNECTED,
          kubeConfigPath: "/path/to/kubeconfig",
          contextName: "my-context",
          labels: { env: "prod", team: "platform" },
        }),
      ]);
      entityRegistry.addObservableSource("test", source);

      const info = clusterEnumeration.clusters[0];

      expect(info.id).toBe("test-cluster");
      expect(info.name).toBe("Test Cluster");
      expect(info.kubeConfigPath).toBe("/path/to/kubeconfig");
      expect(info.contextName).toBe("my-context");
      expect(info.status).toBe(ClusterConnectionStatus.CONNECTED);
      expect(info.labels).toEqual({ env: "prod", team: "platform" });
    });

    it("includes metadata when available", () => {
      const source = observable.array([
        createTestCluster({
          id: "metadata-cluster",
          name: "Metadata Cluster",
          distro: "eks",
          kubeVersion: "1.28.0",
        }),
      ]);
      entityRegistry.addObservableSource("test", source);

      const info = clusterEnumeration.clusters[0];

      expect(info.metadata).toBeDefined();
      expect(info.metadata?.distribution).toBe("eks");
      expect(info.metadata?.kubernetesVersion).toBe("1.28.0");
    });

    it("handles clusters without metadata", () => {
      const source = observable.array([createTestCluster({ id: "no-metadata", name: "No Metadata Cluster" })]);
      entityRegistry.addObservableSource("test", source);

      const info = clusterEnumeration.clusters[0];

      expect(info.metadata?.distribution).toBeUndefined();
      expect(info.metadata?.kubernetesVersion).toBeUndefined();
    });
  });

  describe("getById", () => {
    beforeEach(() => {
      const source = observable.array([
        createTestCluster({ id: "cluster-a", name: "Cluster A" }),
        createTestCluster({ id: "cluster-b", name: "Cluster B" }),
        createTestCluster({ id: "cluster-c", name: "Cluster C" }),
      ]);
      entityRegistry.addObservableSource("test", source);
    });

    it("returns ClusterInfo for existing cluster", () => {
      const result = clusterEnumeration.getById("cluster-b");

      expect(result).toBeDefined();
      expect(result?.id).toBe("cluster-b");
      expect(result?.name).toBe("Cluster B");
    });

    it("returns undefined for non-existent cluster", () => {
      expect(clusterEnumeration.getById("non-existent")).toBeUndefined();
    });

    it("returns undefined for empty string", () => {
      expect(clusterEnumeration.getById("")).toBeUndefined();
    });
  });

  describe("filtering", () => {
    it("only enumerates KubernetesCluster entities", () => {
      const source = observable.array([createTestCluster({ id: "cluster-1", name: "Cluster" })]);
      entityRegistry.addObservableSource("test-clusters", source);

      expect(clusterEnumeration.clusters.length).toBe(1);
      expect(clusterEnumeration.clusters[0].id).toBe("cluster-1");
    });
  });
});
