/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import lensProxyCertificateInjectable from "../../common/certificate/lens-proxy-certificate.injectable";
import { lensProxyDispatcherInjectionToken } from "../../common/fetch/lens-proxy-dispatcher-injection-token";
import { getLensProxyAgent } from "./lens-proxy-agent";

const lensProxyDispatcherInjectable = getInjectable({
  id: "lens-proxy-dispatcher",
  instantiate: (di) => {
    const lensProxyCertificate = di.inject(lensProxyCertificateInjectable);

    return () => getLensProxyAgent(lensProxyCertificate.get().cert);
  },
  injectionToken: lensProxyDispatcherInjectionToken,
});

export default lensProxyDispatcherInjectable;
