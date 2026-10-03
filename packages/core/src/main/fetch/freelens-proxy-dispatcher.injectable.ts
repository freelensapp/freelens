/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import freelensProxyCertificateInjectable from "../../common/certificate/freelens-proxy-certificate.injectable";
import { freelensProxyDispatcherInjectionToken } from "../../common/fetch/freelens-proxy-dispatcher-injection-token";
import { getFreelensProxyAgent } from "./freelens-proxy-agent";

const freelensProxyDispatcherInjectable = getInjectable({
  id: "freelens-proxy-dispatcher",
  instantiate: (di) => {
    const freelensProxyCertificate = di.inject(freelensProxyCertificateInjectable);

    return () => getFreelensProxyAgent(freelensProxyCertificate.get().cert);
  },
  injectionToken: freelensProxyDispatcherInjectionToken,
});

export default freelensProxyDispatcherInjectable;
