/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getRequestChannelListenerInjectable } from "@freelensapp/messaging";
import { getActiveHelmRepositoriesChannel } from "../../../../common/helm/get-active-helm-repositories-channel";
import getActiveHelmRepositoriesInjectable from "./get-active-helm-repositories.injectable";

const getActiveHelmRepositoriesChannelListenerInjectable = getRequestChannelListenerInjectable({
  id: "get-active-helm-repositories-channel-listener",
  channel: getActiveHelmRepositoriesChannel,
  getHandler: (di) => di.inject(getActiveHelmRepositoriesInjectable),
});

export default getActiveHelmRepositoriesChannelListenerInjectable;
