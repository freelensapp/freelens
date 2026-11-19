/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { cpuUnitsToNumber, unitsToBytes } from "@freelensapp/utilities";
import { countBy } from "es-toolkit/compat";
import { computed, observable } from "mobx";
import { KubeObjectStore } from "../../../common/k8s-api/kube-object.store";

import type { PodApi, PodMetricsApi } from "@freelensapp/kube-api";
import type {
  KubeObject,
  NamespaceScopedMetadata,
  PersistentVolumeClaim,
  Pod,
  PodMetrics,
} from "@freelensapp/kube-object";

import type { KubeObjectStoreDependencies, KubeObjectStoreOptions } from "../../../common/k8s-api/kube-object.store";

export interface PodStoreDependencies extends KubeObjectStoreDependencies {
  readonly podMetricsApi: PodMetricsApi;
}

const kubeMetricsRefreshSeconds = 10;

/**
 * A GET that the API server refuses with 403 rejects with its `Status` rather
 * than an error.
 */
const isForbidden = (error: unknown) =>
  typeof error === "object" && error !== null && (error as { code?: unknown }).code === 403;

interface PodIndexes {
  readonly byOwnerId: Map<string, Pod[]>;
  readonly byNode: Map<string, Pod[]>;
  readonly byNamespace: Map<string, Pod[]>;
  readonly byPersistentVolumeClaim: Map<string, Pod[]>;
}

const addToIndex = (index: Map<string, Pod[]>, key: string, pod: Pod) => {
  const pods = index.get(key);

  if (pods) {
    pods.push(pod);
  } else {
    index.set(key, [pod]);
  }
};

const persistentVolumeClaimKey = (namespace: string, name: string) => `${namespace}/${name}`;

// One pass in store order, so that a lookup returns its pods in the order a
// filter of `items` would.
const indexPods = (pods: readonly Pod[]): PodIndexes => {
  const indexes: PodIndexes = {
    byOwnerId: new Map(),
    byNode: new Map(),
    byNamespace: new Map(),
    byPersistentVolumeClaim: new Map(),
  };

  for (const pod of pods) {
    // A pod that names the same owner twice is listed once for it.
    for (const ownerId of new Set(pod.getOwnerRefs().map((owner) => owner.uid))) {
      addToIndex(indexes.byOwnerId, ownerId, pod);
    }

    const nodeName = pod.spec?.nodeName;

    if (typeof nodeName === "string") {
      addToIndex(indexes.byNode, nodeName, pod);
    }

    addToIndex(indexes.byNamespace, pod.getNs(), pod);

    const claimNames = new Set(pod.getVolumes().flatMap((volume) => volume.persistentVolumeClaim?.claimName ?? []));

    for (const claimName of claimNames) {
      addToIndex(indexes.byPersistentVolumeClaim, persistentVolumeClaimKey(pod.getNs(), claimName), pod);
    }
  }

  return indexes;
};

export class PodStore extends KubeObjectStore<Pod, PodApi> {
  constructor(
    protected readonly dependencies: PodStoreDependencies,
    api: PodApi,
    opts?: KubeObjectStoreOptions,
  ) {
    super(dependencies, api, opts);
  }

  // Views look pods up once per row, so a scan of every pod per lookup made
  // a list of workloads quadratic in the size of the cluster. Kept alive, so
  // that a lookup outside a reaction does not rebuild the index each time.
  private readonly indexes = computed(() => indexPods(this.items), { keepAlive: true });

  readonly kubeMetrics = observable.array<PodMetrics>([]);

  @computed get kubeMetricsByPod(): Map<string, PodMetrics> {
    const map = new Map<string, PodMetrics>();

    for (const metric of this.kubeMetrics) {
      map.set(`${metric.getNs()}/${metric.getName()}`, metric);
    }

    return map;
  }

  /**
   * Whether the metrics of the pods of the whole cluster were refused. A user
   * who may read them only in some namespaces then gets them for each selected
   * namespace, one request each.
   */
  private kubeMetricsForbiddenInCluster = false;

  private loadsKubeMetricsPerNamespace() {
    const { context } = this.dependencies;

    return this.kubeMetricsForbiddenInCluster && !context.isLoadingAll(context.contextNamespaces);
  }

  /**
   * How often the pod list loads the metrics: every 10 seconds, or, when it
   * sends a request for each selected namespace, at most one request a second.
   */
  get kubeMetricsRefreshSeconds(): number {
    return this.loadsKubeMetricsPerNamespace()
      ? Math.max(kubeMetricsRefreshSeconds, this.dependencies.context.contextNamespaces.length)
      : kubeMetricsRefreshSeconds;
  }

  async loadKubeMetrics(namespace?: string) {
    const { context, podMetricsApi } = this.dependencies;

    // One request for the cluster, unless it was refused: more requests only
    // for a user who may not read the metrics of the whole cluster.
    if (namespace || !this.loadsKubeMetricsPerNamespace()) {
      try {
        this.kubeMetrics.replace((await podMetricsApi.list({ namespace })) ?? []);

        return;
      } catch (error) {
        if (namespace || !isForbidden(error) || context.isLoadingAll(context.contextNamespaces)) {
          console.warn("loadKubeMetrics failed", error);

          return;
        }

        this.kubeMetricsForbiddenInCluster = true;
      }
    }

    const results = await Promise.allSettled(
      context.contextNamespaces.map((ns) => podMetricsApi.list({ namespace: ns })),
    );
    const metrics: PodMetrics[] = [];

    for (const result of results) {
      switch (result.status) {
        case "fulfilled":
          metrics.push(...(result.value ?? []));
          break;

        case "rejected":
          console.warn("loadKubeMetrics failed", result.reason);
      }
    }

    if (results.some((result) => result.status === "fulfilled")) {
      this.kubeMetrics.replace(metrics);
    }
  }

  // The lookups return copies, so that a caller sorting or changing the result
  // does not change the index.

  getPodsByOwner(workload: KubeObject<NamespaceScopedMetadata, unknown, unknown>): Pod[] {
    return this.getPodsByOwnerId(workload.getId());
  }

  getPodsByOwnerId(workloadId: string): Pod[] {
    return [...(this.indexes.get().byOwnerId.get(workloadId) ?? [])];
  }

  getPodsByNode(node: string): Pod[] {
    if (!this.isLoaded) return [];

    return [...(this.indexes.get().byNode.get(node) ?? [])];
  }

  getPodsByNamespace(namespace: string): Pod[] {
    return [...(this.indexes.get().byNamespace.get(namespace) ?? [])];
  }

  // The pods `persistentVolumeClaim.getPods(podStore.items)` returns.
  getPodsByPersistentVolumeClaim(persistentVolumeClaim: PersistentVolumeClaim): Pod[] {
    const key = persistentVolumeClaimKey(persistentVolumeClaim.getNs(), persistentVolumeClaim.getName());

    return [...(this.indexes.get().byPersistentVolumeClaim.get(key) ?? [])];
  }

  getStatuses(pods: Pod[]) {
    return countBy(
      pods
        .map((pod) => pod.getStatus())
        .sort()
        .reverse(),
    );
  }

  getPodKubeMetrics(pod: Pod) {
    const containers = pod.getContainers();
    const empty = { cpu: 0, memory: 0 };
    const metrics = this.kubeMetricsByPod.get(`${pod.getNs()}/${pod.getName()}`);

    if (!metrics || !metrics.containers || !containers) return { cpu: NaN, memory: NaN };

    return containers.reduce((total, container) => {
      let cpu = "0";
      let memory = "0";

      const metric = metrics.containers?.find((item) => item.name == container.name);

      if (metric && metric.usage) {
        cpu = metric.usage.cpu || "0";
        memory = metric.usage.memory || "0";
      }

      return {
        cpu: total.cpu + (cpuUnitsToNumber(cpu) ?? 0),
        memory: total.memory + unitsToBytes(memory),
      };
    }, empty);
  }
}
