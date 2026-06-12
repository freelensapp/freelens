/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getRequestChannel } from "@freelensapp/messaging";

import type { ClusterId } from "../../../../common/cluster-types";

export interface ActivateCluster {
  clusterId: ClusterId;

  /**
   * @default false
   */
  force?: boolean;
}

export const activateClusterChannel = getRequestChannel<ActivateCluster, void>("activate-cluster");

export const deactivateClusterChannel = getRequestChannel<ClusterId, void>("deactivate-cluster");
