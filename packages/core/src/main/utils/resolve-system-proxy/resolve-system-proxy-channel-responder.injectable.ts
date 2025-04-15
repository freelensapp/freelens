/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getRequestChannelListenerInjectable } from "@freelensapp/messaging";
import { resolveSystemProxyChannel } from "../../../common/utils/resolve-system-proxy/resolve-system-proxy-channel";
import resolveSystemProxyInjectable from "./resolve-system-proxy.injectable";

const resolveSystemProxyChannelResponderInjectable = getRequestChannelListenerInjectable({
  id: "resolve-system-proxy-channel-responder-listener",
  channel: resolveSystemProxyChannel,
  getHandler: (di) => di.inject(resolveSystemProxyInjectable),
});

export default resolveSystemProxyChannelResponderInjectable;
