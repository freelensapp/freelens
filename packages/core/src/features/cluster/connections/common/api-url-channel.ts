/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getRequestChannel } from "@freelensapp/messaging";

import type { ClusterId } from "../../../../common/cluster-types";

/**
 * The address of a cluster's API server, as its kubeconfig names it, without any credentials the
 * URL may carry. `undefined` when the kubeconfig cannot be read.
 */
export const clusterApiUrlChannel = getRequestChannel<ClusterId, string | undefined>("cluster-api-url");
