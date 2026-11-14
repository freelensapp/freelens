/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getMessageChannelListenerInjectable } from "@freelensapp/messaging";
import { runInAction } from "mobx";
import currentlyInClusterFrameInjectable from "../../../renderer/routes/currently-in-cluster-frame.injectable";
import { aiApprovalRequestChannel } from "../common/ai-tools";
import aiApprovalsStateInjectable from "./ai-approvals-state.injectable";

/**
 * Collects approval requests in the root frame, which is always there; a
 * cluster frame ignores them, so a request is asked once.
 */
const aiApprovalRequestListenerInjectable = getMessageChannelListenerInjectable({
  id: "ai-approval-request",
  channel: aiApprovalRequestChannel,
  getHandler: (di) => {
    const approvals = di.inject(aiApprovalsStateInjectable);

    return (request) => {
      if (di.inject(currentlyInClusterFrameInjectable)) {
        return;
      }

      runInAction(() => {
        if (!approvals.some((pending) => pending.id === request.id)) {
          approvals.push(request);
        }
      });
    };
  },
});

export default aiApprovalRequestListenerInjectable;
