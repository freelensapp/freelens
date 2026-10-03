/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { apiBaseServerAddressInjectionToken } from "../../common/k8s-api/api-base-configs";
import freelensProxyPortInjectable from "../freelens-proxy/freelens-proxy-port.injectable";

const apiBaseServerAddressInjectable = getInjectable({
  id: "api-base-server-address",
  instantiate: (di) => {
    const freelensProxyPort = di.inject(freelensProxyPortInjectable);

    return `https://127.0.0.1:${freelensProxyPort.get()}`;
  },
  injectionToken: apiBaseServerAddressInjectionToken,
});

export default apiBaseServerAddressInjectable;
