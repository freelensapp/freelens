/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { requestFromChannelInjectionToken } from "@freelensapp/messaging";
import { showErrorNotificationInjectable } from "@freelensapp/notifications";
import { getInjectable } from "@ogre-tools/injectable";
import activeKubernetesClusterInjectable from "../../../renderer/cluster-frame-context/active-kubernetes-cluster.injectable";
import currentlyInClusterFrameInjectable from "../../../renderer/routes/currently-in-cluster-frame.injectable";
import { askAiInClusterChannel } from "../common/ai-tools";
import askAiDialogStateInjectable from "./ask-ai-dialog-state.injectable";

import type { AskAiRequest } from "../common/ask-ai-request";

export type OpenAskAi = (request: AskAiRequest) => Promise<void>;

/**
 * Opens the Ask AI dialog. The terminal an assistant runs in belongs to a
 * cluster frame, so from the root frame the request goes, through main, to
 * the frame of the active cluster.
 */
const openAskAiInjectable = getInjectable({
  id: "open-ask-ai",
  instantiate: (di): OpenAskAi => {
    const dialogState = di.inject(askAiDialogStateInjectable);
    const showErrorNotification = di.inject(showErrorNotificationInjectable);

    return async (request) => {
      // Injected when used: which frame this is, is a side effect of the page.
      if (di.inject(currentlyInClusterFrameInjectable)) {
        dialogState.set(request);

        return;
      }

      const cluster = di.inject(activeKubernetesClusterInjectable).get();

      if (!cluster) {
        showErrorNotification("Open a cluster to ask AI about it.");

        return;
      }

      const requestFromChannel = di.inject(requestFromChannelInjectionToken);
      const result = await requestFromChannel(askAiInClusterChannel, { clusterId: cluster.getId(), request });

      if (!result.callWasSuccessful) {
        showErrorNotification(result.error);
      }
    };
  },
});

export default openAskAiInjectable;
