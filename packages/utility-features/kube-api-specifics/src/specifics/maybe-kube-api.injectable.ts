/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { apiKubeInjectionToken } from "@freelensapp/kube-api";
import { getInjectable } from "@ogre-tools/injectable";

export const maybeKubeApiInjectable = getInjectable({
  id: "maybe-kube-api",
  instantiate: (di) => {
    try {
      return di.inject(apiKubeInjectionToken);
    } catch {
      return undefined;
    }
  },
});
