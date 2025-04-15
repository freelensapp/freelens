/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { AsyncResult } from "@freelensapp/utilities";
import { getInjectionToken } from "@ogre-tools/injectable";

export interface KubeResourceListGroup {
  group: string;
  path: string;
}

export interface ClusterData {
  readonly id: string;
}

export interface ApiVersionsRequester {
  request(cluster: ClusterData): AsyncResult<KubeResourceListGroup[], Error>;
  readonly orderNumber: number;
}

export const apiVersionsRequesterInjectionToken = getInjectionToken<ApiVersionsRequester>({
  id: "request-api-versions-token",
});
