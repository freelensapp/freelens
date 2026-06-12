/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getRequestChannelListenerInjectable } from "@freelensapp/messaging";
import { getAllClustersChannel } from "../common/channels";
import getAllClustersInjectable from "./get-all-clusters.injectable";

const getAllClustersListenerInjectable = getRequestChannelListenerInjectable({
  id: "get-all-clusters-channel-listener",
  channel: getAllClustersChannel,
  getHandler: (di) => di.inject(getAllClustersInjectable),
});

export default getAllClustersListenerInjectable;
