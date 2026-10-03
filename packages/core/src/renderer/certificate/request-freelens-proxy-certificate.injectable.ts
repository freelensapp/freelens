/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { requestFromChannelInjectionToken } from "@freelensapp/messaging";
import { getInjectable } from "@ogre-tools/injectable";
import { freelensProxyCertificateChannel } from "../../common/certificate/freelens-proxy-certificate-channel";

const requestFreelensProxyCertificateInjectable = getInjectable({
  id: "request-freelens-proxy-certificate",
  instantiate: (di) => {
    const requestFromChannel = di.inject(requestFromChannelInjectionToken);

    return () => requestFromChannel(freelensProxyCertificateChannel);
  },
});

export default requestFreelensProxyCertificateInjectable;
