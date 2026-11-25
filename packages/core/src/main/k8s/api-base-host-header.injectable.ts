/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { apiBaseHostHeaderInjectionToken } from "../../common/k8s-api/api-base-configs";
import freelensProxyPortInjectable from "../freelens-proxy/freelens-proxy-port.injectable";

const apiBaseHostHeaderInjectable = getInjectable({
  id: "api-base-host-header",
  instantiate: (di) => {
    const freelensProxyPort = di.inject(freelensProxyPortInjectable);

    return `renderer.freelens.app:${freelensProxyPort.get()}`;
  },
  injectionToken: apiBaseHostHeaderInjectionToken,
});

export default apiBaseHostHeaderInjectable;
