/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import cronstrue from "cronstrue";

import type { CronJob } from "@freelensapp/kube-object";

export function humanizeSchedule(schedule: string): string {
  try {
    return cronstrue.toString(schedule, { verbose: true });
  } catch {
    return "Unrecognized cron expression syntax";
  }
}

export function getScheduleFullDescription(cronJob: CronJob): string {
  const schedule = cronJob.getSchedule().replace(/\s+/g, " ");
  const humanized = humanizeSchedule(schedule);
  return `${schedule} (${humanized}${cronJob.isNeverRun() ? ", never ran" : ""})`;
}
