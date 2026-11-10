/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import freelensProxyCertificateInjectable from "../../../common/certificate/freelens-proxy-certificate.injectable";
import requestFreelensProxyCertificateInjectable from "../../certificate/request-freelens-proxy-certificate.injectable";
import { beforeFrameStartsFirstInjectionToken } from "../tokens";

const setupFreelensProxyCertificateInjectable = getInjectable({
  id: "setup-freelens-proxy-certificate",
  instantiate: (di) => ({
    run: async () => {
      const requestFreelensProxyCertificate = di.inject(requestFreelensProxyCertificateInjectable);
      const freelensProxyCertificate = di.inject(freelensProxyCertificateInjectable);

      freelensProxyCertificate.set(await requestFreelensProxyCertificate());
    },
  }),
  injectionToken: beforeFrameStartsFirstInjectionToken,
});

export default setupFreelensProxyCertificateInjectable;
