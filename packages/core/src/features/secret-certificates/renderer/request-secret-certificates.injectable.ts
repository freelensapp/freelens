/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { requestFromChannelInjectionToken } from "@freelensapp/messaging";
import { getInjectable } from "@ogre-tools/injectable";
import { parseSecretCertificatesChannel } from "../common/channels";

import type { ChannelRequester } from "@freelensapp/messaging";

export type RequestSecretCertificates = ChannelRequester<typeof parseSecretCertificatesChannel>;

const requestSecretCertificatesInjectable = getInjectable({
  id: "request-secret-certificates",
  instantiate: (di): RequestSecretCertificates => {
    const requestFromChannel = di.inject(requestFromChannelInjectionToken);

    return (blocks) => requestFromChannel(parseSecretCertificatesChannel, blocks);
  },
});

export default requestSecretCertificatesInjectable;
