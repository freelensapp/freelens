/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { prefixedLoggerInjectable } from "@freelensapp/logger";
import { sendMessageToChannelInjectionToken } from "@freelensapp/messaging";
import { getInjectable } from "@ogre-tools/injectable";
import randomBytesInjectable from "../../../common/utils/random-bytes.injectable";
import { aiApprovalRequestChannel, aiApprovalResolvedChannel } from "../common/ai-tools";

import type { AiApprovalRequest } from "../common/ai-tools";

export interface AiApprovals {
  /**
   * Asks the user to approve a request of an AI session. Resolves false when
   * the user denies it, or does not answer in time.
   */
  request: (details: Omit<AiApprovalRequest, "id" | "expiresAt">) => Promise<boolean>;
  /** The user's answer, from the root frame. Unknown or expired ids are ignored. */
  decide: (id: string, approved: boolean) => void;
}

export const aiApprovalTimeout = 2 * 60 * 1000;

const aiApprovalsInjectable = getInjectable({
  id: "ai-approvals",
  instantiate: (di): AiApprovals => {
    const sendMessageToChannel = di.inject(sendMessageToChannelInjectionToken);
    const randomBytes = di.inject(randomBytesInjectable);
    const logger = di.inject(prefixedLoggerInjectable, "AI-APPROVALS");
    const pending = new Map<string, (approved: boolean) => void>();

    return {
      request: (details) =>
        new Promise<boolean>((resolve) => {
          const id = randomBytes(12).toString("hex");
          const timer = setTimeout(() => {
            if (pending.delete(id)) {
              logger.warn(`denied unanswered: ${details.providerName} wanted to ${details.action}`);
              sendMessageToChannel(aiApprovalResolvedChannel, id);
              resolve(false);
            }
          }, aiApprovalTimeout);

          pending.set(id, (approved) => {
            clearTimeout(timer);
            pending.delete(id);
            logger.info(`${approved ? "approved" : "denied"}: ${details.providerName} wanted to ${details.action}`);
            // Every frame drops the prompt, whichever answered it.
            sendMessageToChannel(aiApprovalResolvedChannel, id);
            resolve(approved);
          });

          sendMessageToChannel(aiApprovalRequestChannel, {
            ...details,
            id,
            expiresAt: Date.now() + aiApprovalTimeout,
          });
        }),
      decide: (id, approved) => {
        pending.get(id)?.(approved === true);
      },
    };
  },
});

export default aiApprovalsInjectable;
