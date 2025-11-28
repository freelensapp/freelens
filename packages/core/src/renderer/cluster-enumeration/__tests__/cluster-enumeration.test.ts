/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { KubernetesCluster, LensKubernetesClusterStatus } from "../../../common/catalog-entities/kubernetes-cluster";
import { ClusterConnectionStatus } from "../../../extensions/common-api/cluster-types";
import { ClusterEnumeration } from "../../../features/cluster/enumeration/common";

function createTestCluster(options: {
  id: string;
  name: string;
  status?: LensKubernetesClusterStatus;
  labels?: Record<string, string>;
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
      kubeconfigPath: `/home/user/.kube/config-${options.id}`,
      kubeconfigContext: `context-${options.id}`,
    },
    status: {
      phase: options.status ?? LensKubernetesClusterStatus.DISCONNECTED,
    },
  });
}

function createRendererEnumeration(clusters: KubernetesCluster[], activeId?: string) {
  const activeCluster = activeId ? clusters.find((c) => c.getId() === activeId) : undefined;

  return new ClusterEnumeration({
    getKubernetesClusters: () => clusters,
    getActiveClusterId: () => activeCluster?.getId(),
    getActiveCluster: () => activeCluster,
  });
}

describe("RendererClusterEnumeration", () => {
  describe("clusters", () => {
    it("returns empty array when no clusters exist", () => {
      const enumeration = createRendererEnumeration([]);

      expect(enumeration.clusters).toEqual([]);
    });

    it("returns ClusterInfo for each KubernetesCluster", () => {
      const clusters = [
        createTestCluster({ id: "c1", name: "Cluster 1", status: LensKubernetesClusterStatus.CONNECTED }),
        createTestCluster({ id: "c2", name: "Cluster 2", status: LensKubernetesClusterStatus.DISCONNECTED }),
      ];
      const enumeration = createRendererEnumeration(clusters);

      expect(enumeration.clusters.length).toBe(2);
      expect(enumeration.clusters[0].id).toBe("c1");
      expect(enumeration.clusters[1].id).toBe("c2");
    });

    it("maps status correctly", () => {
      const clusters = [createTestCluster({ id: "c1", name: "C1", status: LensKubernetesClusterStatus.CONNECTED })];
      const enumeration = createRendererEnumeration(clusters);

      expect(enumeration.clusters[0].status).toBe(ClusterConnectionStatus.CONNECTED);
    });
  });

  describe("isActive tracking", () => {
    it("marks active cluster correctly", () => {
      const clusters = [
        createTestCluster({ id: "c1", name: "Cluster 1" }),
        createTestCluster({ id: "c2", name: "Cluster 2" }),
      ];
      const enumeration = createRendererEnumeration(clusters, "c2");

      const c1 = enumeration.clusters.find((c) => c.id === "c1");
      const c2 = enumeration.clusters.find((c) => c.id === "c2");

      expect(c1?.isActive).toBe(false);
      expect(c2?.isActive).toBe(true);
    });

    it("handles no active cluster", () => {
      const clusters = [createTestCluster({ id: "c1", name: "Cluster 1" })];
      const enumeration = createRendererEnumeration(clusters);

      expect(enumeration.clusters[0].isActive).toBe(false);
    });
  });

  describe("activeCluster", () => {
    it("returns active cluster info", () => {
      const clusters = [
        createTestCluster({ id: "c1", name: "Cluster 1" }),
        createTestCluster({ id: "c2", name: "Active Cluster" }),
      ];
      const enumeration = createRendererEnumeration(clusters, "c2");

      expect(enumeration.activeCluster?.id).toBe("c2");
      expect(enumeration.activeCluster?.name).toBe("Active Cluster");
    });

    it("returns undefined when no active cluster", () => {
      const clusters = [createTestCluster({ id: "c1", name: "Cluster 1" })];
      const enumeration = createRendererEnumeration(clusters);

      expect(enumeration.activeCluster).toBeUndefined();
    });
  });

  describe("getById", () => {
    it("returns cluster by ID", () => {
      const clusters = [
        createTestCluster({ id: "c1", name: "Cluster 1" }),
        createTestCluster({ id: "c2", name: "Cluster 2" }),
      ];
      const enumeration = createRendererEnumeration(clusters);

      expect(enumeration.getById("c2")?.name).toBe("Cluster 2");
    });

    it("returns undefined for non-existent ID", () => {
      const enumeration = createRendererEnumeration([]);

      expect(enumeration.getById("non-existent")).toBeUndefined();
    });

    it("returns undefined for empty string", () => {
      const enumeration = createRendererEnumeration([]);

      expect(enumeration.getById("")).toBeUndefined();
    });
  });

  describe("metadata", () => {
    it("includes cluster metadata", () => {
      const clusters = [createTestCluster({ id: "c1", name: "EKS Cluster", distro: "eks", kubeVersion: "1.28.0" })];
      const enumeration = createRendererEnumeration(clusters);

      expect(enumeration.clusters[0].metadata?.distribution).toBe("eks");
      expect(enumeration.clusters[0].metadata?.kubernetesVersion).toBe("1.28.0");
    });
  });
});
