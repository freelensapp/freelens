/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { object } from "@freelensapp/utilities";
import { capitalize } from "es-toolkit";
import { observer } from "mobx-react";
import { formatKubeApiResource } from "../../../common/rbac";
import { StatusCard } from "../overview-cards";
import { statusBackgroundColorMapping } from "./overview-workload-status";
import styles from "./workload-status-cards.module.scss";

import type { StatusCardStatus, StatusCardTone } from "../overview-cards";
import type { WorkloadStatus } from "./overview-workload-status";
import type { Workload } from "./workloads/workload-injection-token";

type StatusName = keyof typeof statusBackgroundColorMapping;

// Healthy first, then waiting, then broken: the bar reads left to right from good to bad.
const statusOrder: readonly StatusName[] = [
  "running",
  "scheduled",
  "succeeded",
  "complete",
  "pending",
  "suspended",
  "terminating",
  "finalizing",
  "terminated",
  "unknown",
  "failed",
  "evicted",
];
const healthyStatuses = new Set<StatusName>(["running", "scheduled", "succeeded", "complete"]);
const failingStatuses = new Set<StatusName>(["failed", "evicted"]);

const isStatusName = (name: string): name is StatusName => Object.hasOwn(statusBackgroundColorMapping, name);

const toneOf = (name: StatusName): StatusCardTone => {
  if (healthyStatuses.has(name)) {
    return "healthy";
  }

  return failingStatuses.has(name) ? "failing" : "neutral";
};

/**
 * The statuses of one kind of workload as the status card shows them: in the order of the bar, from healthy to
 * failing, without the empty ones, in the status colors of the theme.
 */
export const toStatusCardStatuses = (workloadStatus: WorkloadStatus): StatusCardStatus[] => {
  const counts = new Map<StatusName, number>();

  for (const [status, value] of object.entries(workloadStatus)) {
    const name = status.toLowerCase();

    if (isStatusName(name) && typeof value === "number" && value > 0) {
      counts.set(name, (counts.get(name) ?? 0) + value);
    }
  }

  return statusOrder
    .filter((name) => counts.has(name))
    .map((name) => ({
      label: capitalize(name),
      count: counts.get(name) ?? 0,
      color: `var(--${statusBackgroundColorMapping[name]})`,
      tone: toneOf(name),
    }));
};

/** The namespaces the overview counts in: all of them, a single one, or several. */
export type NamespaceScope = "all" | "one" | "several";

const noneText: Record<NamespaceScope, string> = {
  all: "None in any namespace",
  one: "None in this namespace",
  several: "None in these namespaces",
};

const toTestId = (title: string) => title.toLowerCase().replace(/\s+/g, "-");

interface WorkloadStatusCardProps {
  workload: Workload;
  namespaceScope: NamespaceScope;
}

const WorkloadStatusCard = observer(({ workload, namespaceScope }: WorkloadStatusCardProps) => (
  <StatusCard
    title={workload.title}
    total={workload.amountOfItems.get()}
    statuses={toStatusCardStatuses(workload.status.get())}
    emptyText={noneText[namespaceScope]}
    onClick={workload.open}
    data-testid={`workload-status-card-${toTestId(workload.title)}`}
  />
));

export interface WorkloadStatusCardsProps {
  workloads: Workload[];
  /** Which namespaces the workloads are counted in, for the text of a kind with no items. */
  namespaceScope: NamespaceScope;
}

/**
 * One card per kind of workload, with its total, the share that is healthy and the number that fail,
 * and a bar and a legend of its statuses. The whole card opens the list of that kind.
 */
export const WorkloadStatusCards = observer(({ workloads, namespaceScope }: WorkloadStatusCardsProps) => (
  <div className={styles.cards} data-testid="workload-status-cards">
    {workloads.map((workload) => (
      <WorkloadStatusCard
        key={formatKubeApiResource(workload.resource)}
        workload={workload}
        namespaceScope={namespaceScope}
      />
    ))}
  </div>
));
