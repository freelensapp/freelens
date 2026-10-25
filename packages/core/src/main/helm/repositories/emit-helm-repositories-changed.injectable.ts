/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { sendMessageToChannelInjectionToken } from "@freelensapp/messaging";
import { getInjectable } from "@ogre-tools/injectable";
import { helmRepositoriesChangedChannel } from "../../../common/helm/helm-repositories-changed-channel";

const emitHelmRepositoriesChangedInjectable = getInjectable({
  id: "emit-helm-repositories-changed",

  instantiate: (di) => {
    const sendMessageToChannel = di.inject(sendMessageToChannelInjectionToken);

    return () => sendMessageToChannel(helmRepositoriesChangedChannel);
  },
});

export default emitHelmRepositoriesChangedInjectable;
