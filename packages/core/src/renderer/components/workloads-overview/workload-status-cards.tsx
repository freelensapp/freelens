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

import type { LensTheme } from "../../themes/lens-theme";
import type { Workload } from "./workloads/workload-injection-token";

type StatusName = keyof typeof statusBackgroundColorMapping;

// Healthy first, then waiting, then broken: the bar reads left to right from good to bad.
const statusOrder: StatusName[] = [
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
const problemStatuses = new Set<StatusName>(["failed", "evicted"]);

interface StatusSlice {
  name: StatusName;
  count: number;
  color: string;
}

const getSlices = (workload: Workload, theme: LensTheme): StatusSlice[] => {
  const counts = new Map<StatusName, number>();

  for (const [status, value] of object.entries(workload.status.get())) {
    const name = status.toLowerCase() as StatusName;

    if (name in statusBackgroundColorMapping && typeof value === "number" && value > 0) {
      counts.set(name, (counts.get(name) ?? 0) + value);
    }
  }

  return statusOrder
    .filter((name) => counts.has(name))
    .map((name) => ({
      name,
      count: counts.get(name) ?? 0,
      color: theme.colors[statusBackgroundColorMapping[name]],
    }));
};

const percent = (value: number, total: number) => (total > 0 ? `${Math.round((value / total) * 100)}%` : "—");

const WorkloadStatusCard = observer(({ workload, theme }: { workload: Workload; theme: LensTheme }) => {
  const total = workload.amountOfItems.get();
  const slices = getSlices(workload, theme);
  const counted = slices.reduce((sum, slice) => sum + slice.count, 0);
  const healthy = slices.filter((slice) => healthyStatuses.has(slice.name)).reduce((sum, s) => sum + s.count, 0);
  const problems = slices.filter((slice) => problemStatuses.has(slice.name)).reduce((sum, s) => sum + s.count, 0);
  const testId = workload.title.toLowerCase().replace(/\s+/g, "-");

  return (
    <button
      type="button"
      className={styles.card}
      onClick={workload.open}
      data-testid={`workload-status-card-${testId}`}
    >
      <span className={styles.header}>
        <span className={styles.title}>{workload.title}</span>
        <Icon material="chevron_right" smallest className={styles.chevron} />
      </span>

      <span className={styles.summary}>
        <span className={styles.total}>{total}</span>
        {counted > 0 && <span className={styles.health}>{`${percent(healthy, counted)} healthy`}</span>}
        {problems > 0 && <span className={styles.problem}>{`${problems} failing`}</span>}
      </span>

      <span className={styles.bar} aria-hidden="true">
        {slices.map((slice) => (
          <span
            key={slice.name}
            className={styles.segment}
            data-healthy={healthyStatuses.has(slice.name) || undefined}
            style={{ flexGrow: slice.count, background: slice.color }}
          />
        ))}
      </span>

      {slices.length > 0 ? (
        <span className={styles.legend}>
          {slices.map((slice) => (
            <span
              key={slice.name}
              className={styles.legendRow}
              data-problem={problemStatuses.has(slice.name) || undefined}
            >
              <span className={styles.dot} style={{ background: slice.color }} aria-hidden="true" />
              <span className={styles.label}>{capitalize(slice.name)}</span>
              <span className={styles.count}>{slice.count}</span>
              <span className={styles.percent}>{percent(slice.count, counted)}</span>
            </span>
          ))}
        </span>
      ) : (
        <span className={styles.empty}>{total > 0 ? "No status reported" : "None in this namespace"}</span>
      )}
    </button>
  );
});

export const WorkloadStatusCards = observer(({ workloads, theme }: { workloads: Workload[]; theme: LensTheme }) => (
  <div className={styles.cards} data-testid="workload-status-cards">
    {workloads.map((workload) => (
      <WorkloadStatusCard key={formatKubeApiResource(workload.resource)} workload={workload} theme={theme} />
    ))}
  </div>
));
