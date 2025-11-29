/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getRequestChannel } from "@freelensapp/messaging";

import type { ExecuteOnClusterRequest, ExecuteOnClusterResponse } from "./types";

/**
 * IPC channel for executing Kubernetes API operations on a cluster.
 * Used for cross-process communication between renderer and main process.
 *
 * @example
 * // In renderer process
 * const response = await executeOnClusterChannel.request({
 *   clusterId: "my-cluster",
 *   operation: "list",
 *   resource: { apiVersion: "v1", kind: "Pod", namespace: "default" }
 * });
 *
 * @see packages/core/src/features/cluster/enumeration/common/channels.ts for pattern reference
 */
export const executeOnClusterChannel = getRequestChannel<ExecuteOnClusterRequest, ExecuteOnClusterResponse>(
  "execute-on-cluster",
);
