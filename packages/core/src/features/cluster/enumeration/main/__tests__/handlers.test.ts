/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { observable } from "mobx";
import {
  KubernetesCluster,
  LensKubernetesClusterStatus,
} from "../../../../../common/catalog-entities/kubernetes-cluster";
import catalogEntityRegistryInjectable from "../../../../../main/catalog/entity-registry.injectable";
import { getDiForUnitTesting } from "../../../../../main/getDiForUnitTesting";
import getAllClustersInjectable from "../get-all-clusters.injectable";
import getClusterByIdInjectable from "../get-cluster-by-id.injectable";

import type { ClusterInfo } from "../../../../../extensions/common-api/cluster-types";

function createTestCluster(options: {
  id: string;
  name: string;
  status?: LensKubernetesClusterStatus;
}): KubernetesCluster {
  return new KubernetesCluster({
    metadata: {
      uid: options.id,
      name: options.name,
      source: "test",
      labels: {},
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

describe("Cluster Enumeration IPC Handlers", () => {
  describe("getAllClusters handler", () => {
    it("returns empty array when no clusters exist", () => {
      const di = getDiForUnitTesting();
      const getAllClusters = di.inject(getAllClustersInjectable);

      const result = getAllClusters();

      expect(result).toEqual([]);
    });

    it("returns all clusters as ClusterInfo[]", () => {
      const di = getDiForUnitTesting();
      const entityRegistry = di.inject(catalogEntityRegistryInjectable);

      const source = observable.array([
        createTestCluster({ id: "c1", name: "Cluster 1", status: LensKubernetesClusterStatus.CONNECTED }),
        createTestCluster({ id: "c2", name: "Cluster 2", status: LensKubernetesClusterStatus.DISCONNECTED }),
      ]);
      entityRegistry.addObservableSource("test", source);

      const getAllClusters = di.inject(getAllClustersInjectable);
      const result: ClusterInfo[] = getAllClusters();

      expect(result.length).toBe(2);
      expect(result[0].id).toBe("c1");
      expect(result[0].name).toBe("Cluster 1");
      expect(result[1].id).toBe("c2");
      expect(result[1].name).toBe("Cluster 2");
    });

    it("correctly maps cluster status", () => {
      const di = getDiForUnitTesting();
      const entityRegistry = di.inject(catalogEntityRegistryInjectable);

      const source = observable.array([
        createTestCluster({ id: "connected", name: "Connected", status: LensKubernetesClusterStatus.CONNECTED }),
        createTestCluster({
          id: "disconnected",
          name: "Disconnected",
          status: LensKubernetesClusterStatus.DISCONNECTED,
        }),
        createTestCluster({ id: "connecting", name: "Connecting", status: LensKubernetesClusterStatus.CONNECTING }),
      ]);
      entityRegistry.addObservableSource("test", source);

      const getAllClusters = di.inject(getAllClustersInjectable);
      const result = getAllClusters();

      expect(result[0].status).toBe("connected");
      expect(result[1].status).toBe("disconnected");
      expect(result[2].status).toBe("connecting");
    });
  });

  describe("getClusterById handler", () => {
    it("returns undefined for non-existent cluster", () => {
      const di = getDiForUnitTesting();
      const getClusterById = di.inject(getClusterByIdInjectable);

      const result = getClusterById("non-existent");

      expect(result).toBeUndefined();
    });

    it("returns undefined for empty string", () => {
      const di = getDiForUnitTesting();
      const getClusterById = di.inject(getClusterByIdInjectable);

      const result = getClusterById("");

      expect(result).toBeUndefined();
    });

    it("returns cluster info for existing cluster", () => {
      const di = getDiForUnitTesting();
      const entityRegistry = di.inject(catalogEntityRegistryInjectable);

      const source = observable.array([
        createTestCluster({
          id: "target-cluster",
          name: "Target Cluster",
          status: LensKubernetesClusterStatus.CONNECTED,
        }),
        createTestCluster({ id: "other-cluster", name: "Other Cluster" }),
      ]);
      entityRegistry.addObservableSource("test", source);

      const getClusterById = di.inject(getClusterByIdInjectable);
      const result = getClusterById("target-cluster");

      expect(result).toBeDefined();
      expect(result?.id).toBe("target-cluster");
      expect(result?.name).toBe("Target Cluster");
    });
  });
});
