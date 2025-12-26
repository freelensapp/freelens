/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getRequestChannel } from "@freelensapp/messaging";

import type { ExecuteOnClusterRequest, ExecuteOnClusterResponse } from "./types";

/**
 * IPC channel for executing Kubernetes API operations on any cluster.
 */
export const executeOnClusterChannel = getRequestChannel<ExecuteOnClusterRequest, ExecuteOnClusterResponse>(
  "execute-on-cluster",
);
