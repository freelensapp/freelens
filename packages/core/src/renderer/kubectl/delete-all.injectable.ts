/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { requestFromChannelInjectionToken } from "@freelensapp/messaging";
import { getInjectable } from "@ogre-tools/injectable";
import { kubectlDeleteAllChannel, kubectlDeleteAllInjectionToken } from "../../common/kube-helpers/channels";

const kubectlDeleteAllInjectable = getInjectable({
  id: "kubectl-delete-all",
  instantiate: (di) => {
    const requestFromChannel = di.inject(requestFromChannelInjectionToken);

    return (req) => requestFromChannel(kubectlDeleteAllChannel, req);
  },
  injectionToken: kubectlDeleteAllInjectionToken,
});

export default kubectlDeleteAllInjectable;
