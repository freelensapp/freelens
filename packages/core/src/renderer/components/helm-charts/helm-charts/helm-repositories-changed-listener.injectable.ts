/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getMessageChannelListenerInjectable } from "@freelensapp/messaging";
import { helmRepositoriesChangedChannel } from "../../../../common/helm/helm-repositories-changed-channel";
import helmChartsInjectable from "./helm-charts.injectable";

const helmRepositoriesChangedListenerInjectable = getMessageChannelListenerInjectable({
  id: "invalidate-helm-charts",
  channel: helmRepositoriesChangedChannel,
  // Injected lazily, so that frames which never open Helm > Charts do not create the list at start
  getHandler: (di) => () => di.inject(helmChartsInjectable).invalidate(),
});

export default helmRepositoriesChangedListenerInjectable;
