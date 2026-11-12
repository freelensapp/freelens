/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getRequestChannelListenerInjectable } from "@freelensapp/messaging";
import { parseSecretCertificatesChannel } from "../common/channels";
import { parseSecretCertificates } from "./parse-certificates";

const handleParseSecretCertificatesInjectable = getRequestChannelListenerInjectable({
  id: "handle-parse-secret-certificates",
  channel: parseSecretCertificatesChannel,
  getHandler: () => parseSecretCertificates,
});

export default handleParseSecretCertificatesInjectable;
