/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import {
  apiBaseHostHeaderInjectionToken,
  apiBaseServerAddressInjectionToken,
} from "../../common/k8s-api/api-base-configs";
import { clusterApiAddressInjectionToken } from "../../common/k8s-api/cluster-api-address-injection-token";

const clusterApiAddressInjectable = getInjectable({
  id: "cluster-api-address",
  instantiate: (di) => {
    const serverAddress = di.inject(apiBaseServerAddressInjectionToken);
    const baseHostHeader = di.inject(apiBaseHostHeaderInjectionToken);

    return (clusterId: string) => ({
      serverAddress,
      hostHeader: `${clusterId}.${baseHostHeader}`,
    });
  },
  injectionToken: clusterApiAddressInjectionToken,
});

export default clusterApiAddressInjectable;
