/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getRequestChannelListenerInjectable } from "@freelensapp/messaging";
import { getClusterByIdChannel } from "../common/channels";
import getClusterByIdInjectable from "./get-cluster-by-id.injectable";

const getClusterByIdListenerInjectable = getRequestChannelListenerInjectable({
  id: "get-cluster-by-id-channel-listener",
  channel: getClusterByIdChannel,
  getHandler: (di) => di.inject(getClusterByIdInjectable),
});

export default getClusterByIdListenerInjectable;
