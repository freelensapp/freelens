/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { requestFromChannelInjectionToken } from "@freelensapp/messaging";
import { getInjectable } from "@ogre-tools/injectable";
import { runInAction } from "mobx";
import { aiApprovalDecisionChannel } from "../common/ai-tools";
import aiApprovalsStateInjectable from "./ai-approvals-state.injectable";

export type AnswerAiApproval = (id: string, approved: boolean) => Promise<void>;

const answerAiApprovalInjectable = getInjectable({
  id: "answer-ai-approval",
  instantiate: (di): AnswerAiApproval => {
    const requestFromChannel = di.inject(requestFromChannelInjectionToken);
    const approvals = di.inject(aiApprovalsStateInjectable);

    return async (id, approved) => {
      runInAction(() => {
        const index = approvals.findIndex((pending) => pending.id === id);

        if (index >= 0) {
          approvals.splice(index, 1);
        }
      });

      await requestFromChannel(aiApprovalDecisionChannel, { id, approved });
    };
  },
});

export default answerAiApprovalInjectable;
