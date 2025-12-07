/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getRequestChannel } from "@freelensapp/messaging";

import type { ClusterId, ClusterInfo } from "../../../../extensions/common-api/cluster-types";

/**
 * Request all clusters from main process.
 */
export const getAllClustersChannel = getRequestChannel<void, ClusterInfo[]>("get-all-clusters");

/**
 * Request a specific cluster by ID from main process.
 */
export const getClusterByIdChannel = getRequestChannel<ClusterId, ClusterInfo | undefined>("get-cluster-by-id");
