/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { KubeApi } from "@freelensapp/kube-api";
import { getInjectionToken } from "@ogre-tools/injectable";

export const customResourceDefinitionApiInjectionToken = getInjectionToken<KubeApi>({
  id: "custom-resource-definition-api-token",
});
