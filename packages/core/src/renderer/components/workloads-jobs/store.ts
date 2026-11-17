/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { PodStatusPhase } from "@freelensapp/kube-object";
import { computed } from "mobx";
import { KubeObjectStore } from "../../../common/k8s-api/kube-object.store";

import type { JobApi } from "@freelensapp/kube-api";
import type { CronJob, Job, Pod } from "@freelensapp/kube-object";

import type { KubeObjectStoreDependencies, KubeObjectStoreOptions } from "../../../common/k8s-api/kube-object.store";
import type { GetPodsByOwnerId } from "../workloads-pods/get-pods-by-owner-id.injectable";

interface Dependencies extends KubeObjectStoreDependencies {
  getPodsByOwnerId: GetPodsByOwnerId;
}

const ownerKey = (namespace: string | undefined, kind: string, name: string) => `${namespace}/${kind}/${name}`;

// Jobs by the namespace, kind and name of each owner, in store order, each job
// once per owner.
const indexJobsByOwner = (jobs: readonly Job[]): Map<string, Job[]> => {
  const index = new Map<string, Job[]>();

  for (const job of jobs) {
    const keys = new Set(job.getOwnerRefs().map((ref) => ownerKey(job.getNs(), ref.kind, ref.name)));

    for (const key of keys) {
      const owned = index.get(key);

      if (owned) {
        owned.push(job);
      } else {
        index.set(key, [job]);
      }
    }
  }

  return index;
};

export class JobStore extends KubeObjectStore<Job, JobApi> {
  constructor(
    protected readonly dependencies: Dependencies,
    api: JobApi,
    opts?: KubeObjectStoreOptions,
  ) {
    super(dependencies, api, opts);
  }

  /**
   * @deprecated Switch to using `getPodsByOwnerId` directly
   */
  getChildPods(job: Job): Pod[] {
    return this.dependencies.getPodsByOwnerId(job.getId());
  }

  // The Active column of the CronJobs list asks once per row, and sorting by it
  // once per CronJob: kept alive, so that the index is built once per change
  // of the jobs and not once per lookup.
  private readonly jobsByOwner = computed(() => indexJobsByOwner(this.items), { keepAlive: true });

  // A copy, so that a caller sorting the result does not change the index.
  getJobsByOwner(cronJob: CronJob): Job[] {
    return [...(this.jobsByOwner.get().get(ownerKey(cronJob.getNs(), cronJob.kind, cronJob.getName())) ?? [])];
  }

  getStatuses(jobs?: Job[]) {
    const status = { succeeded: 0, running: 0, failed: 0, pending: 0 };

    for (const job of jobs ?? []) {
      const statuses = new Set(this.getChildPods(job).map((pod) => pod.getStatus()));

      if (statuses.has(PodStatusPhase.FAILED)) {
        status.failed++;
      } else if (statuses.has(PodStatusPhase.PENDING)) {
        status.pending++;
      } else if (statuses.has(PodStatusPhase.RUNNING)) {
        status.running++;
      } else {
        status.succeeded++;
      }
    }

    return status;
  }
}
