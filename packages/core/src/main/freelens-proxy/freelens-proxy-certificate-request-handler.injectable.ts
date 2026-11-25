/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getRequestChannelListenerInjectable } from "@freelensapp/messaging";
import freelensProxyCertificateInjectable from "../../common/certificate/freelens-proxy-certificate.injectable";
import { freelensProxyCertificateChannel } from "../../common/certificate/freelens-proxy-certificate-channel";

const freelensProxyCertificateRequestHandlerInjectable = getRequestChannelListenerInjectable({
  id: "freelens-proxy-certificate-request-handler-listener",
  channel: freelensProxyCertificateChannel,
  getHandler: (di) => {
    const freelensProxyCertificate = di.inject(freelensProxyCertificateInjectable).get();

    return () => ({
      cert: freelensProxyCertificate.cert,
      public: freelensProxyCertificate.public,
      private: "",
    });
  },
});

export default freelensProxyCertificateRequestHandlerInjectable;
