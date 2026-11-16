/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { bytesToUnits } from "@freelensapp/utilities";
import styles from "./cluster-capacity-cards.module.scss";

import type { ClusterMetricData } from "../../../common/k8s-api/endpoints/metrics.api/request-cluster-metrics-by-node-names.injectable";

export type ClusterLastPoints = Partial<Record<keyof ClusterMetricData, number>>;

interface CapacityResource {
  name: string;
  usage: number;
  requests?: number;
  limits?: number;
  allocatable: number;
  capacity?: number;
  /** Value with its unit, e.g. "4.00 cores", "7.7GiB", "110 pods" */
  format: (value: number) => string;
  /** Headline number, e.g. "0.79", "4.0GiB", "15" */
  formatShort: (value: number) => string;
  usageLabel: string;
}

const isNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

const percentOf = (value: number, total: number) => (total > 0 ? `${Math.round((value / total) * 100)}%` : "—");

const widthOf = (value: number, scale: number) => `${scale > 0 ? Math.min(100, (value / scale) * 100) : 0}%`;

const getCapacityResources = (points: ClusterLastPoints): CapacityResource[] => {
  const resources: CapacityResource[] = [];

  if (isNumber(points.cpuAllocatableCapacity) && isNumber(points.cpuUsage)) {
    resources.push({
      name: "CPU",
      usage: points.cpuUsage,
      requests: points.cpuRequests,
      limits: points.cpuLimits,
      allocatable: points.cpuAllocatableCapacity,
      capacity: points.cpuCapacity,
      format: (value) => `${value.toFixed(2)} cores`,
      formatShort: (value) => value.toFixed(2),
      usageLabel: "Usage",
    });
  }

  if (isNumber(points.memoryAllocatableCapacity) && isNumber(points.memoryUsage)) {
    resources.push({
      name: "Memory",
      usage: points.memoryUsage,
      requests: points.memoryRequests,
      limits: points.memoryLimits,
      allocatable: points.memoryAllocatableCapacity,
      capacity: points.memoryCapacity,
      format: (value) => bytesToUnits(value),
      formatShort: (value) => bytesToUnits(value),
      usageLabel: "Usage",
    });
  }

  if (isNumber(points.podAllocatableCapacity) && isNumber(points.podUsage)) {
    resources.push({
      name: "Pods",
      usage: points.podUsage,
      allocatable: points.podAllocatableCapacity,
      capacity: points.podCapacity,
      format: (value) => `${Math.round(value)} pods`,
      formatShort: (value) => `${Math.round(value)}`,
      usageLabel: "Running",
    });
  }

  return resources;
};

interface LegendRowProps {
  swatch: string;
  label: string;
  value: string;
  percent?: string;
  warning?: boolean;
}

const LegendRow = ({ swatch, label, value, percent, warning }: LegendRowProps) => (
  <div className={styles.legendRow} data-warning={warning || undefined}>
    <span className={swatch} aria-hidden="true" />
    <dt title={label}>{label}</dt>
    <dd>
      <span className={styles.legendValue}>{value}</span>
      <span className={styles.legendPercent}>{percent}</span>
    </dd>
  </div>
);

const CapacityCard = ({ resource }: { resource: CapacityResource }) => {
  const { name, usage, requests, limits, allocatable, capacity, format, formatShort, usageLabel } = resource;
  const overflow = isNumber(limits) && limits > allocatable ? limits - allocatable : 0;
  const isOvercommitted = overflow > 0;
  const overcommitRatio = isNumber(limits) && allocatable > 0 ? limits / allocatable : 0;
  const scale = Math.max(allocatable, usage, requests ?? 0, limits ?? 0);
  const allocatableWidth = widthOf(allocatable, scale);
  const isMarkerAtEnd = scale > 0 && allocatable / scale > 0.85;
  // Capacity only earns a row when it differs from what is allocatable.
  const extraCapacity = isNumber(capacity) && Math.abs(capacity - allocatable) > allocatable * 0.005 ? capacity : null;
  const testId = name.toLowerCase();

  return (
    <section className={styles.card} aria-label={name} data-testid={`capacity-card-${testId}`}>
      <header className={styles.header}>
        <h3 className={styles.title}>{name}</h3>
        <span className={styles.percent} title="Usage of allocatable" data-testid={`capacity-card-${testId}-percent`}>
          {percentOf(usage, allocatable)}
        </span>
      </header>

      <div className={styles.summary}>
        <span className={styles.value}>{formatShort(usage)}</span>
        <span className={styles.of}>{`/ ${format(allocatable)}`}</span>
      </div>

      <div
        className={styles.bar}
        role="img"
        aria-label={`${name}: ${format(usage)} used of ${format(allocatable)} allocatable`}
      >
        <div className={styles.track} style={{ width: allocatableWidth }} />
        {isOvercommitted && (
          <div
            className={styles.overflow}
            style={{ left: allocatableWidth, width: widthOf(overflow, scale) }}
            data-testid={`capacity-card-${testId}-overflow`}
          />
        )}
        {isNumber(requests) && <div className={styles.requests} style={{ width: widthOf(requests, scale) }} />}
        <div className={styles.usage} style={{ width: widthOf(usage, scale) }} />
        <div className={styles.marker} style={{ left: allocatableWidth }} />
        <span
          className={styles.markerLabel}
          style={{ left: allocatableWidth, transform: isMarkerAtEnd ? "translateX(-100%)" : "translateX(-50%)" }}
          aria-hidden="true"
        >
          Allocatable
        </span>
      </div>

      {isOvercommitted && (
        <div className={styles.overcommit} data-testid={`capacity-card-${testId}-overcommit`}>
          {`Limits ${overcommitRatio.toFixed(1)}× allocatable`}
        </div>
      )}

      <dl className={styles.legend}>
        <LegendRow
          swatch={styles.swatchUsage}
          label={usageLabel}
          value={format(usage)}
          percent={percentOf(usage, allocatable)}
        />
        {isNumber(requests) && (
          <LegendRow
            swatch={styles.swatchRequests}
            label="Requests"
            value={format(requests)}
            percent={percentOf(requests, allocatable)}
          />
        )}
        {isNumber(limits) && (
          <LegendRow
            swatch={styles.swatchLimits}
            label="Limits"
            value={format(limits)}
            percent={percentOf(limits, allocatable)}
            warning={isOvercommitted}
          />
        )}
        <LegendRow swatch={styles.swatchAllocatable} label="Allocatable" value={format(allocatable)} />
        {extraCapacity !== null && (
          <LegendRow swatch={styles.swatchCapacity} label="Capacity" value={format(extraCapacity)} />
        )}
      </dl>
    </section>
  );
};

export interface ClusterCapacityCardsProps {
  lastPoints: ClusterLastPoints;
}

/**
 * One card per resource of the cluster, CPU, memory and pods, with its usage, requests and limits on the
 * scale of what is allocatable. A resource without metrics has no card.
 */
export const ClusterCapacityCards = ({ lastPoints }: ClusterCapacityCardsProps) => (
  <div className={styles.cards} data-testid="cluster-capacity-cards">
    {getCapacityResources(lastPoints).map((resource) => (
      <CapacityCard key={resource.name} resource={resource} />
    ))}
  </div>
);
