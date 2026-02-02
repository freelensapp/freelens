/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { ClusterId } from "../../common/cluster-types";

export type { ClusterId };

/**
 * Connection status of a Kubernetes cluster.
 */
export enum ClusterConnectionStatus {
  CONNECTING = "connecting",
  CONNECTED = "connected",
  DISCONNECTED = "disconnected",
  DISCONNECTING = "disconnecting",
}

/**
 * Type guard for ClusterConnectionStatus values.
 */
export function isClusterConnectionStatus(value: unknown): value is ClusterConnectionStatus {
  return typeof value === "string" && Object.values(ClusterConnectionStatus).includes(value as ClusterConnectionStatus);
}

/**
 * Extended metadata about a cluster (may not always be available).
 */
export interface ClusterMetadata {
  /** Distribution type (e.g., "eks", "gke", "aks", "minikube") */
  readonly distribution?: string;
  /** Kubernetes version (e.g., "1.28.0") */
  readonly kubernetesVersion?: string;
  /** Number of nodes */
  readonly nodeCount?: number;
  /** Last successful connection time */
  readonly lastConnected?: Date;
  /** Connection error message, if any */
  readonly connectionError?: string;
}

/**
 * Cluster information exposed to extensions.
 *
 * @example
 * ```typescript
 * const clusters = Clusters.getAll();
 * for (const cluster of clusters) {
 *   console.log(`${cluster.name}: ${cluster.status}`);
 * }
 * ```
 */
export interface ClusterInfo {
  /** Unique cluster identifier (same as catalog entity metadata.uid) */
  readonly id: ClusterId;
  readonly name: string;
  readonly kubeConfigPath: string;
  readonly contextName: string;
  readonly status: ClusterConnectionStatus;
  readonly labels: Readonly<Record<string, string>>;
  readonly isActive: boolean;
  readonly metadata?: ClusterMetadata;
}
