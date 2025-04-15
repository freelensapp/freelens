/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { prometheusProviderInjectionToken } from "@freelensapp/prometheus";
import { getInjectable } from "@ogre-tools/injectable";
import { computedInjectManyInjectable } from "@ogre-tools/injectable-extension-for-mobx";

const prometheusProvidersInjectable = getInjectable({
  id: "prometheus-providers",
  instantiate: (di) => {
    const computedInjectMany = di.inject(computedInjectManyInjectable);

    return computedInjectMany(prometheusProviderInjectionToken);
  },
});

export default prometheusProvidersInjectable;
