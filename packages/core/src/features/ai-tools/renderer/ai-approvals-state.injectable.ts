/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { observable } from "mobx";

import type { AiApprovalRequest } from "../common/ai-tools";

/**
 * Requests of AI sessions waiting for the user's answer, oldest first.
 */
const aiApprovalsStateInjectable = getInjectable({
  id: "ai-approvals-state",
  instantiate: () => observable.array<AiApprovalRequest>([], { deep: false }),
});

export default aiApprovalsStateInjectable;
