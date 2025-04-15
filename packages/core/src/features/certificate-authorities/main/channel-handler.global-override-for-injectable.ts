/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getGlobalOverride } from "@freelensapp/test-utils";
import { casChannel } from "../common/channel";
import certificateAuthoritiesChannelListenerInjectable from "./channel-handler.injectable";

export default getGlobalOverride(certificateAuthoritiesChannelListenerInjectable, () => ({
  id: "certificate-authorities-channel-listener",
  channel: casChannel,
  handler: () => [],
}));
