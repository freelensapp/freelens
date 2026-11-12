/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import freelensProxyCertificateInjectable from "../../common/certificate/freelens-proxy-certificate.injectable";
import { freelensProxyDispatcherInjectionToken } from "../../common/fetch/freelens-proxy-dispatcher-injection-token";
import freelensProxyTokenInjectable from "../freelens-proxy/freelens-proxy-token.injectable";
import { getFreelensProxyAgent, withBearerToken } from "./freelens-proxy-agent";

import type { Dispatcher } from "undici";

const freelensProxyDispatcherInjectable = getInjectable({
  id: "freelens-proxy-dispatcher",
  instantiate: (di) => {
    const freelensProxyCertificate = di.inject(freelensProxyCertificateInjectable);
    const token = di.inject(freelensProxyTokenInjectable);
    // compose() allocates a dispatcher, and the certificate and token are
    // fixed for the run, so the composed dispatcher is built once.
    let dispatcher: Dispatcher | undefined;

    return () =>
      (dispatcher ??= getFreelensProxyAgent(freelensProxyCertificate.get().cert).compose(withBearerToken(token.value)));
  },
  injectionToken: freelensProxyDispatcherInjectionToken,
});

export default freelensProxyDispatcherInjectable;
