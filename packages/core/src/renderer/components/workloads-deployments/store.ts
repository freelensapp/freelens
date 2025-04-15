/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { DeploymentApi } from "@freelensapp/kube-api";
import type { Deployment } from "@freelensapp/kube-object";
import { PodStatusPhase } from "@freelensapp/kube-object";
import type { KubeObjectStoreDependencies, KubeObjectStoreOptions } from "../../../common/k8s-api/kube-object.store";
import { KubeObjectStore } from "../../../common/k8s-api/kube-object.store";
import type { PodStore } from "../workloads-pods/store";

// This needs to be disables because of https://github.com/microsoft/TypeScript/issues/15300
export type DeploymentStatuses = {
  running: number;
  failed: number;
  pending: number;
};

export interface DeploymentStoreDependencies extends KubeObjectStoreDependencies {
  readonly podStore: PodStore;
}

export class DeploymentStore extends KubeObjectStore<Deployment, DeploymentApi> {
  constructor(
    protected readonly dependencies: DeploymentStoreDependencies,
    api: DeploymentApi,
    opts?: KubeObjectStoreOptions,
  ) {
    super(dependencies, api, opts);
  }

  protected sortItems(items: Deployment[]) {
    return super.sortItems(items, [(item) => item.getReplicas()], "desc");
  }

  getStatuses(deployments: Deployment[]): DeploymentStatuses;
  /**
   * @deprecated
   */
  getStatuses(deployments: Deployment[] | undefined): DeploymentStatuses;
  getStatuses(deployments: Deployment[] = []) {
    const status = { running: 0, failed: 0, pending: 0 };

    deployments.forEach((deployment) => {
      const statuses = new Set(this.getChildPods(deployment).map((pod) => pod.getStatus()));

      if (statuses.has(PodStatusPhase.FAILED)) {
        status.failed++;
      } else if (statuses.has(PodStatusPhase.PENDING)) {
        status.pending++;
      } else {
        status.running++;
      }
    });

    return status;
  }

  getChildPods(deployment: Deployment) {
    return this.dependencies.podStore
      .getByLabel(deployment.getTemplateLabels())
      .filter((pod) => pod.getNs() === deployment.getNs());
  }
}
