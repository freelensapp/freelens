/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getRequestChannelListenerInjectable } from "@freelensapp/messaging";
import { aiApprovalDecisionChannel } from "../common/ai-tools";
import aiApprovalsInjectable from "./ai-approvals.injectable";

const aiApprovalDecisionListenerInjectable = getRequestChannelListenerInjectable({
  id: "ai-approval-decision-listener",
  channel: aiApprovalDecisionChannel,
  getHandler: (di) => {
    const approvals = di.inject(aiApprovalsInjectable);

    return ({ id, approved }) => approvals.decide(id, approved);
  },
});

export default aiApprovalDecisionListenerInjectable;
