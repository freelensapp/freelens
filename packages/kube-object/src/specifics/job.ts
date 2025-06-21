/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { KubeObject } from "../kube-object";

import type { KubeObjectStatus, LabelSelector, NamespaceScopedMetadata } from "../api-types";
import type { PodSpec } from "./pod";

export interface JobSpec {
  parallelism?: number;
  completions?: number;
  activeDeadlineSeconds?: number;
  podFailurePolicy?: {
    action: string;
    onExitCodes?: {
      containerName?: string;
      operator: string;
      values: number[];
    }[];
    onPodConditions?: {
      type: string;
      status: string;
    }[];
  }[];
  successPolicy?: {
    rules: {
      succeededIndexes: string;
      succeededCount: number;
    }[];
  };
  backoffLimit?: number;
  backoffLimitPerIndex?: number;
  maxFailedIndexes?: number;
  selector?: LabelSelector;
  manualSelector?: boolean;
  template: {
    metadata: {
      creationTimestamp?: string;
      labels?: Partial<Record<string, string>>;
      annotations?: Partial<Record<string, string>>;
    };
    spec: PodSpec;
  };
  ttlSecondsAfterFinished?: number;
  completionMode?: string;
  suspend?: boolean;
  podReplacementPolicy?: string;
  managedBy?: string;
}

export interface JobStatus extends KubeObjectStatus {
  startTime?: string;
  completionTime?: string;
  active?: number;
  succeeded?: number;
  failed?: number;
  terminating?: number;
  completedIndexes?: string;
  failedIndexes?: string;
  uncountedTerminatedPods?: {
    succeeded: string[];
    failed: string[];
  };
  ready?: number;
}

export class Job extends KubeObject<NamespaceScopedMetadata, JobStatus, JobSpec> {
  static readonly kind = "Job";

  static readonly namespaced = true;

  static readonly apiBase = "/apis/batch/v1/jobs";

  getSelectors(): string[] {
    return KubeObject.stringifyLabels(this.spec.selector?.matchLabels);
  }

  getNodeSelectors(): string[] {
    return KubeObject.stringifyLabels(this.spec.template.spec.nodeSelector);
  }

  getTemplateLabels(): string[] {
    return KubeObject.stringifyLabels(this.spec.template.metadata.labels);
  }

  getTolerations() {
    return this.spec.template.spec.tolerations ?? [];
  }

  getAffinity() {
    return this.spec.template.spec.affinity;
  }

  getAffinityNumber() {
    return Object.keys(this.getAffinity() ?? {}).length;
  }

  getDesiredCompletions() {
    return this.spec.completions ?? 0;
  }

  getCompletions() {
    return this.status?.succeeded ?? 0;
  }

  getParallelism() {
    return this.spec.parallelism;
  }

  getCondition() {
    // Type of Job condition could be only Complete or Failed
    // https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.21/#jobcondition-v1-batch
    return this.status?.conditions?.find(({ status }) => status === "True");
  }

  getImages() {
    return this.spec.template.spec.containers?.map((container) => container.image) ?? [];
  }

  getJobDuration() {
    if (!this.status?.startTime) {
      return 0;
    }

    if (!this.status?.completionTime) {
      return Date.now() - new Date(this.status.startTime).getTime();
    }

    return new Date(this.status.completionTime).getTime() - new Date(this.status.startTime).getTime();
  }

  getConditions() {
    return this.status?.conditions ?? [];
  }

  hasCondition(type: string) {
    return this.getConditions().some((condition) => condition.type === type);
  }
}
