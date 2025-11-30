/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { KubeApiPatchType } from "@freelensapp/kube-api";

export type { KubeApiPatchType };

/**
 * Resource identifier for Kubernetes API operations.
 * Matches the query structure used by KubeApi internals.
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
  /** Label selector for filtering (e.g., "app=nginx,env=prod") */
  readonly labelSelector?: string;
  /** Field selector for filtering (e.g., "status.phase=Running") */
  readonly fieldSelector?: string;
}

/**
 * Supported Kubernetes API operations.
 * Maps to KubeApi methods: list, get, create, update, patch, delete.
 */
export type KubeApiOperation = "list" | "get" | "create" | "update" | "patch" | "delete";

/**
 * Request payload for executing operations on a cluster.
 * Sent from renderer to main process via IPC.
 */
export interface ExecuteOnClusterRequest {
  /** Target cluster identifier */
  readonly clusterId: string;
  /** Operation to perform */
  readonly operation: KubeApiOperation;
  /** Resource query specifying what to operate on */
  readonly resource: ResourceQuery;
  /** Request body for create/update/patch operations */
  readonly body?: unknown;
  /** Patch type for patch operations */
  readonly patchType?: KubeApiPatchType;
}

/**
 * Error details returned when an operation fails.
 */
export interface ExecuteOnClusterError {
  /** Human-readable error message */
  readonly message: string;
  /** HTTP status code (e.g., 404, 503) */
  readonly code?: number;
  /** Kubernetes error reason (e.g., "NotFound", "ClusterNotAccessible") */
  readonly reason?: string;
}

/**
 * Response from executing an operation on a cluster.
 * Generic type parameter allows typed responses for different operations.
 */
export interface ExecuteOnClusterResponse<T = unknown> {
  /** Whether the operation succeeded */
  readonly success: boolean;
  /** Response data on success */
  readonly data?: T;
  /** Error details on failure */
  readonly error?: ExecuteOnClusterError;
}
