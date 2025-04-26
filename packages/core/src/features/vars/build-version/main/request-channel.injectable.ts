/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getRequestChannelListenerInjectable } from "@freelensapp/messaging";
import { buildVersionChannel, buildVersionInitializable } from "../common/token";

const buildVersionChannelListenerInjectable = getRequestChannelListenerInjectable({
  id: "build-version-channel-listener",
  channel: buildVersionChannel,
  getHandler: (di) => () => di.inject(buildVersionInitializable.stateToken),
});

export default buildVersionChannelListenerInjectable;
