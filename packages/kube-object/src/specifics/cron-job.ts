/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { formatDuration } from "@freelensapp/utilities";
import moment from "moment";
import { KubeObject } from "../kube-object";

import type { NamespaceScopedMetadata, ObjectReference } from "../api-types";
import type { JobTemplateSpec } from "../types/job-template-spec";

export interface CronJobSpec {
  schedule: string;
  timeZone?: string;
  startingDeadlineSeconds?: number;
  concurrencyPolicy?: string;
  suspend?: boolean;
  jobTemplate?: JobTemplateSpec;
  successfulJobsHistoryLimit?: number;
  failedJobsHistoryLimit?: number;
}

export interface CronJobStatus {
  active?: ObjectReference[];
  lastScheduleTime?: string;
  lastSuccessfulTime?: string;
}

export class CronJob extends KubeObject<NamespaceScopedMetadata, CronJobStatus, CronJobSpec> {
  static readonly kind = "CronJob";

  static readonly namespaced = true;

  static readonly apiBase = "/apis/batch/v1/cronjobs";

  getSuspendFlag() {
    return (this.spec.suspend ?? false).toString();
  }

  getJobSuspendFlag() {
    return (this.spec.jobTemplate?.spec?.suspend ?? false).toString();
  }

  getLastScheduleTime() {
    if (!this.status?.lastScheduleTime) {
      return "-";
    }
    const diff = moment().diff(this.status.lastScheduleTime);

    return formatDuration(diff, true);
  }

  getLastSuccessfulTime() {
    if (!this.status?.lastSuccessfulTime) {
      return "-";
    }
    const diff = moment().diff(this.status.lastSuccessfulTime);

    return formatDuration(diff, true);
  }

  getSchedule() {
    return this.spec.schedule;
  }

  getJobSelectors(): string[] {
    return KubeObject.stringifyLabels(this.spec.jobTemplate?.spec?.selector?.matchLabels);
  }

  getJobNodeSelectors(): string[] {
    return KubeObject.stringifyLabels(this.spec.jobTemplate?.spec?.template.spec.nodeSelector);
  }

  getJobTemplateLabels(): string[] {
    return KubeObject.stringifyLabels(this.spec.jobTemplate?.spec?.template.metadata.labels);
  }

  getJobTolerations() {
    return this.spec.jobTemplate?.spec?.template.spec.tolerations ?? [];
  }

  getJobAffinity() {
    return this.spec.jobTemplate?.spec?.template.spec.affinity;
  }

  getJobAffinityNumber() {
    return Object.keys(this.getJobAffinity() ?? {}).length;
  }

  getJobDesiredCompletions() {
    return this.spec.jobTemplate?.spec?.completions ?? 0;
  }

  getJobParallelism() {
    return this.spec.jobTemplate?.spec?.parallelism;
  }

  isNeverRun() {
    const schedule = this.getSchedule();
    const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    const stamps = schedule.split(" ");
    const day = Number(stamps[stamps.length - 3]); // 1-31
    const month = Number(stamps[stamps.length - 2]); // 1-12

    if (schedule.startsWith("@")) {
      return false;
    }

    return day > daysInMonth[month - 1];
  }

  isSuspend() {
    return this.spec.suspend;
  }

  isJobSuspend() {
    return this.spec.jobTemplate?.spec?.suspend;
  }
}
