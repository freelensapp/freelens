/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Icon } from "@freelensapp/icon";
import { object } from "@freelensapp/utilities";
import { capitalize } from "es-toolkit";
import { observer } from "mobx-react";
import { formatKubeApiResource } from "../../../common/rbac";
import { statusBackgroundColorMapping } from "./overview-workload-status";
import styles from "./workload-status-cards.module.scss";

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

interface StatusSlice {
  name: StatusName;
  count: number;
  /** The status color of the active theme. */
  color: string;
}

const getSlices = (workload: Workload): StatusSlice[] => {
  const counts = new Map<StatusName, number>();

  for (const [status, value] of object.entries(workload.status.get())) {
    const name = status.toLowerCase();

    if (isStatusName(name) && typeof value === "number" && value > 0) {
      counts.set(name, (counts.get(name) ?? 0) + value);
    }
  }

  return statusOrder
    .filter((name) => counts.has(name))
    .map((name) => ({
      name,
      count: counts.get(name) ?? 0,
      color: `var(--${statusBackgroundColorMapping[name]})`,
    }));
};

const sumOf = (slices: StatusSlice[], statuses: Set<StatusName>) =>
  slices.filter((slice) => statuses.has(slice.name)).reduce((sum, slice) => sum + slice.count, 0);

const percentOf = (value: number, total: number) => (total > 0 ? `${Math.round((value / total) * 100)}%` : "—");

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

const WorkloadStatusCard = observer(({ workload, namespaceScope }: WorkloadStatusCardProps) => {
  const total = workload.amountOfItems.get();
  const slices = getSlices(workload);
  const counted = slices.reduce((sum, slice) => sum + slice.count, 0);
  const healthy = sumOf(slices, healthyStatuses);
  const failing = sumOf(slices, failingStatuses);
  const testId = `workload-status-card-${toTestId(workload.title)}`;

  return (
    <button type="button" className={styles.card} onClick={workload.open} data-testid={testId}>
      <span className={styles.header}>
        <span className={styles.title}>{workload.title}</span>
        <Icon material="chevron_right" smallest className={styles.chevron} />
      </span>

      <span className={styles.summary}>
        <span className={styles.total} data-testid={`${testId}-total`}>
          {total}
        </span>
        {counted > 0 && <span className={styles.health}>{`${percentOf(healthy, counted)} healthy`}</span>}
        {failing > 0 && (
          <span className={styles.failing} data-testid={`${testId}-failing`}>{`${failing} failing`}</span>
        )}
      </span>

      <span className={styles.bar} aria-hidden="true">
        {slices.map((slice) => (
          <span
            key={slice.name}
            className={styles.segment}
            data-healthy={healthyStatuses.has(slice.name) || undefined}
            style={{ flexGrow: slice.count, backgroundColor: slice.color }}
          />
        ))}
      </span>

      {slices.length > 0 ? (
        <span className={styles.legend}>
          {slices.map((slice) => (
            <span
              key={slice.name}
              className={styles.legendRow}
              data-failing={failingStatuses.has(slice.name) || undefined}
              data-testid={`${testId}-status-${slice.name}`}
            >
              <span className={styles.dot} style={{ backgroundColor: slice.color }} aria-hidden="true" />
              <span className={styles.label}>{capitalize(slice.name)}</span>
              <span className={styles.count}>{slice.count}</span>
              <span className={styles.percent}>{percentOf(slice.count, counted)}</span>
            </span>
          ))}
        </span>
      ) : (
        <span className={styles.empty} data-testid={`${testId}-empty`}>
          {total > 0 ? "No status reported" : noneText[namespaceScope]}
        </span>
      )}
    </button>
  );
});

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
