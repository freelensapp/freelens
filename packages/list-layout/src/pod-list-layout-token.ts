/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { Pod } from "@freelensapp/kube-object";
import { getInjectionToken } from "@ogre-tools/injectable";
import type { SpecificKubeListLayoutColumn } from "./kube-list-layout-column";

export const podListLayoutColumnInjectionToken = getInjectionToken<SpecificKubeListLayoutColumn<Pod>>({
  id: "kube-object-list-layout-column",
});
