/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// `Renderer.Catalog.getAllClusters()` and `getClusterById()` are observable
// through the host's mobx, and that is the contract by which an extension
// follows a cluster connecting or disconnecting (C5 in docs/extensions/api.md).
// Nothing fails loudly if that is lost: a `reaction` an extension runs on them
// simply stops firing. So these tests run one, through the API functions, and
// change the status the way the renderer learns of it, by an update of the
// catalog's items from main.

import { reaction } from "mobx";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { KubernetesCluster, LensKubernetesClusterStatus } from "../../common/catalog-entities/kubernetes-cluster";
import catalogEntityRegistryInjectable from "../../renderer/api/catalog/entity/registry.injectable";
import { getDiForUnitTesting } from "../../renderer/getDiForUnitTesting";
import { ClusterConnectionStatus } from "../common-api/cluster-types";
import * as Renderer from "../renderer-api";

import type { IReactionDisposer } from "mobx";

import type { CatalogEntityRegistry } from "../../renderer/api/catalog/entity/registry";

describe("Renderer.Catalog clusters, observed through mobx", () => {
  let catalogEntityRegistry: CatalogEntityRegistry;
  let disposeReaction: IReactionDisposer | undefined;

  // The data main sends over IPC for one cluster.
  const sendFromMain = (phase: LensKubernetesClusterStatus) =>
    catalogEntityRegistry.updateItems([
      {
        apiVersion: KubernetesCluster.apiVersion,
        kind: KubernetesCluster.kind,
        metadata: { uid: "some-cluster-id", name: "some-cluster", source: "local", labels: {} },
        spec: { kubeconfigPath: "/some-kubeconfig-path", kubeconfigContext: "some-context" },
        status: { phase },
      },
    ]);

  beforeEach(() => {
    const di = getDiForUnitTesting();

    catalogEntityRegistry = di.inject(catalogEntityRegistryInjectable);
    sendFromMain(LensKubernetesClusterStatus.CONNECTED);
  });

  afterEach(() => {
    disposeReaction?.();
    disposeReaction = undefined;
  });

  it("runs a reaction on getAllClusters() when a cluster disconnects", () => {
    const seen: ClusterConnectionStatus[][] = [];

    disposeReaction = reaction(
      () => Renderer.Catalog.getAllClusters().map(({ status }) => status),
      (statuses) => seen.push(statuses),
    );

    sendFromMain(LensKubernetesClusterStatus.DISCONNECTED);

    expect(seen).toEqual([[ClusterConnectionStatus.DISCONNECTED]]);
  });

  it("runs a reaction on getClusterById() when the cluster disconnects and connects again", () => {
    const seen: (ClusterConnectionStatus | undefined)[] = [];

    disposeReaction = reaction(
      () => Renderer.Catalog.getClusterById("some-cluster-id")?.status,
      (status) => seen.push(status),
    );

    sendFromMain(LensKubernetesClusterStatus.DISCONNECTED);
    sendFromMain(LensKubernetesClusterStatus.CONNECTING);
    sendFromMain(LensKubernetesClusterStatus.CONNECTED);

    expect(seen).toEqual([
      ClusterConnectionStatus.DISCONNECTED,
      ClusterConnectionStatus.CONNECTING,
      ClusterConnectionStatus.CONNECTED,
    ]);
  });
});
