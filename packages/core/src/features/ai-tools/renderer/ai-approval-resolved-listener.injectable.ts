/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getMessageChannelListenerInjectable } from "@freelensapp/messaging";
import { runInAction } from "mobx";
import { aiApprovalResolvedChannel } from "../common/ai-tools";
import aiApprovalsStateInjectable from "./ai-approvals-state.injectable";

const aiApprovalResolvedListenerInjectable = getMessageChannelListenerInjectable({
  id: "ai-approval-resolved",
  channel: aiApprovalResolvedChannel,
  getHandler: (di) => {
    const approvals = di.inject(aiApprovalsStateInjectable);

    return (id) =>
      runInAction(() => {
        const index = approvals.findIndex((pending) => pending.id === id);

        if (index >= 0) {
          approvals.splice(index, 1);
        }
      });
  },
});

export default aiApprovalResolvedListenerInjectable;
