/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { KubeApiPatchType } from "@freelensapp/kube-api";

import type { ClusterId } from "../../../../common/cluster-types";

export type { KubeApiPatchType };
export type { ClusterId };

/**
 * Resource identifier for Kubernetes API operations.
 */
export interface ResourceQuery {
  /** API version (e.g., "v1", "apps/v1") */
  readonly apiVersion: string;
  /** Resource kind (e.g., "Pod", "Deployment") */
  readonly kind: string;
  /** Namespace for namespaced resources */
  readonly namespace?: string;
  /** Resource name for single-resource operations */
  readonly name?: string;
  /** Label selector (e.g., "app=nginx,env=prod") */
  readonly labelSelector?: string;
  /** Field selector (e.g., "status.phase=Running") */
  readonly fieldSelector?: string;
}

/**
 * Supported Kubernetes API operations.
 */
export type KubeApiOperation = "list" | "get" | "create" | "update" | "patch" | "delete";

/**
 * Request payload for executing operations on a cluster via IPC.
 */
export interface ExecuteOnClusterRequest {
  readonly clusterId: ClusterId;
  readonly operation: KubeApiOperation;
  readonly resource: ResourceQuery;
  readonly body?: unknown;
  readonly patchType?: KubeApiPatchType;
}

/**
 * Error details returned when an operation fails.
 */
export interface ExecuteOnClusterError {
  readonly message: string;
  /** HTTP status code (e.g., 404, 503) */
  readonly code?: number;
  /** Kubernetes error reason (e.g., "NotFound") */
  readonly reason?: string;
}

/**
 * Response from executing an operation on a cluster.
 */
export interface ExecuteOnClusterResponse<T = unknown> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: ExecuteOnClusterError;
}
