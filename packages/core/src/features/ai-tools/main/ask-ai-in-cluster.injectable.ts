/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getRequestChannelListenerInjectable } from "@freelensapp/messaging";
import clusterFramesInjectable from "../../../common/cluster-frames.injectable";
import getCurrentApplicationWindowInjectable from "../../../main/start-main-application/lens-window/application-window/get-current-application-window.injectable";
import { askAiInClusterChannel, askAiInClusterFrameChannel } from "../common/ai-tools";

const askAiInClusterListenerInjectable = getRequestChannelListenerInjectable({
  id: "ask-ai-in-cluster-listener",
  channel: askAiInClusterChannel,
  getHandler: (di) => {
    const clusterFrames = di.inject(clusterFramesInjectable);
    const getApplicationWindow = di.inject(getCurrentApplicationWindowInjectable);

    return ({ clusterId, request }) => {
      const frameInfo = clusterFrames.get(clusterId);
      const applicationWindow = getApplicationWindow();

      if (!frameInfo || !applicationWindow) {
        return { callWasSuccessful: false, error: "Connect to the cluster first, then ask AI." };
      }

      applicationWindow.send({ channel: askAiInClusterFrameChannel.id, frameInfo, data: request });

      return { callWasSuccessful: true };
    };
  },
});

export default askAiInClusterListenerInjectable;
