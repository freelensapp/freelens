/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// `Main.Catalog.getAllClusters()` and `getClusterById()` are observable through
// the host's mobx, and that is the contract by which an extension follows a
// cluster connecting or disconnecting (C5 in docs/extensions/api.md). Nothing
// fails loudly if that is lost: a `reaction` an extension runs on them simply
// stops firing. So these tests run one, through the API functions, and change
// the status the way the host's cluster manager does, in place on the entity.

import { observable, reaction, runInAction } from "mobx";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LensKubernetesClusterStatus } from "../../common/catalog-entities/kubernetes-cluster";
import { createTestCluster } from "../../features/cluster/enumeration/common/test-utils";
import catalogEntityRegistryInjectable from "../../main/catalog/entity-registry.injectable";
import { getDiForUnitTesting } from "../../main/getDiForUnitTesting";
import { ClusterConnectionStatus } from "../common-api/cluster-types";
import * as Main from "../main-api";

import type { IReactionDisposer } from "mobx";

import type { KubernetesCluster } from "../../common/catalog-entities/kubernetes-cluster";

describe("Main.Catalog clusters, observed through mobx", () => {
  let cluster: KubernetesCluster;
  let disposeReaction: IReactionDisposer | undefined;

  beforeEach(() => {
    const di = getDiForUnitTesting();

    cluster = createTestCluster({
      id: "some-cluster-id",
      name: "some-cluster",
      status: LensKubernetesClusterStatus.CONNECTED,
    });
    di.inject(catalogEntityRegistryInjectable).addObservableSource(
      "some-source",
      observable.array([cluster], { deep: false }),
    );
  });

  afterEach(() => {
    disposeReaction?.();
    disposeReaction = undefined;
  });

  const setPhase = (phase: LensKubernetesClusterStatus) =>
    runInAction(() => {
      cluster.status.phase = phase;
    });

  it("runs a reaction on getAllClusters() when a cluster disconnects", () => {
    const seen: ClusterConnectionStatus[][] = [];

    disposeReaction = reaction(
      () => Main.Catalog.getAllClusters().map(({ status }) => status),
      (statuses) => seen.push(statuses),
    );

    setPhase(LensKubernetesClusterStatus.DISCONNECTED);

    expect(seen).toEqual([[ClusterConnectionStatus.DISCONNECTED]]);
  });

  it("runs a reaction on getClusterById() when the cluster disconnects and connects again", () => {
    const seen: (ClusterConnectionStatus | undefined)[] = [];

    disposeReaction = reaction(
      () => Main.Catalog.getClusterById("some-cluster-id")?.status,
      (status) => seen.push(status),
    );

    setPhase(LensKubernetesClusterStatus.DISCONNECTED);
    setPhase(LensKubernetesClusterStatus.CONNECTING);
    setPhase(LensKubernetesClusterStatus.CONNECTED);

    expect(seen).toEqual([
      ClusterConnectionStatus.DISCONNECTED,
      ClusterConnectionStatus.CONNECTING,
      ClusterConnectionStatus.CONNECTED,
    ]);
  });
});
