/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { RequestChannel } from "@freelensapp/messaging";
import { getRequestChannel } from "@freelensapp/messaging";
import type { ClusterId } from "../../../../common/cluster-types";

export type DeleteClusterChannel = RequestChannel<ClusterId, void>;

export const deleteClusterChannel = getRequestChannel<ClusterId, void>("delete-cluster");
