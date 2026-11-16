/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { bytesToUnits } from "@freelensapp/utilities";
import { CapacityCard } from "../overview-cards";
import styles from "./cluster-capacity-cards.module.scss";

import type { ClusterMetricData } from "../../../common/k8s-api/endpoints/metrics.api/request-cluster-metrics-by-node-names.injectable";
import type { CapacityCardProps } from "../overview-cards";

export type ClusterLastPoints = Partial<Record<keyof ClusterMetricData, number>>;

const isNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

const getCapacityCards = (points: ClusterLastPoints): CapacityCardProps[] => {
  const cards: CapacityCardProps[] = [];

  if (isNumber(points.cpuAllocatableCapacity) && isNumber(points.cpuUsage)) {
    cards.push({
      title: "CPU",
      usage: points.cpuUsage,
      requests: points.cpuRequests,
      limits: points.cpuLimits,
      allocatable: points.cpuAllocatableCapacity,
      capacity: points.cpuCapacity,
      format: (value) => `${value.toFixed(2)} cores`,
      formatHeadline: (value) => value.toFixed(2),
    });
  }

  if (isNumber(points.memoryAllocatableCapacity) && isNumber(points.memoryUsage)) {
    cards.push({
      title: "Memory",
      usage: points.memoryUsage,
      requests: points.memoryRequests,
      limits: points.memoryLimits,
      allocatable: points.memoryAllocatableCapacity,
      capacity: points.memoryCapacity,
      format: (value) => bytesToUnits(value),
    });
  }

  if (isNumber(points.podAllocatableCapacity) && isNumber(points.podUsage)) {
    cards.push({
      title: "Pods",
      usage: points.podUsage,
      allocatable: points.podAllocatableCapacity,
      capacity: points.podCapacity,
      format: (value) => `${Math.round(value)} pods`,
      formatHeadline: (value) => `${Math.round(value)}`,
      labels: { usage: "Running" },
    });
  }

  return cards;
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
    {getCapacityCards(lastPoints).map((card) => (
      <CapacityCard key={card.title} {...card} data-testid={`capacity-card-${card.title.toLowerCase()}`} />
    ))}
  </div>
);
