/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { prefixedLoggerInjectable } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import { classifyKubeRequest } from "../common/kube-request-policy";
import aiApprovalsInjectable from "./ai-approvals.injectable";
import aiSessionsInjectable from "./ai-sessions.injectable";

import type { Cluster } from "../../../common/cluster/cluster";

export interface AiSessionGateRequest {
  /** The token the request presented. */
  token: string | undefined;
  cluster: Cluster | undefined;
  method: string;
  /** Path and query as the cluster would get them, without ProLens' prefix. */
  kubePath: string | undefined;
  isUpgrade: boolean;
}

export type AiSessionGateDecision = { allowed: true } | { allowed: false; message: string };

/**
 * Decides on the requests that present an AI session token: undefined when
 * the token is not one, so the proxy's own check applies. A session reaches
 * only the Kubernetes API of its own cluster; reads pass, everything else
 * waits for the user's approval of that exact request.
 */
export type AiSessionGate = (request: AiSessionGateRequest) => Promise<AiSessionGateDecision> | undefined;

const aiSessionGateInjectable = getInjectable({
  id: "ai-session-gate",
  instantiate: (di): AiSessionGate => {
    const sessions = di.inject(aiSessionsInjectable);
    const approvals = di.inject(aiApprovalsInjectable);
    const logger = di.inject(prefixedLoggerInjectable, "AI-SESSION-GATE");

    return ({ token, cluster, method, kubePath, isUpgrade }) => {
      const session = sessions.find(token);

      if (!session) {
        return undefined;
      }

      return (async (): Promise<AiSessionGateDecision> => {
        if (!cluster || cluster.id !== session.clusterId || kubePath === undefined) {
          logger.warn(`${session.providerName}: refused a request outside its cluster's Kubernetes API`);

          return { allowed: false, message: "This AI session may only use the Kubernetes API of its own cluster." };
        }

        const decision = classifyKubeRequest(method, kubePath, isUpgrade);

        if (decision.kind === "read") {
          return { allowed: true };
        }

        const approved = await approvals.request({
          providerName: session.providerName,
          clusterName: cluster.name.get(),
          action: decision.action,
          reason: decision.reason,
          method: isUpgrade ? `${method} (upgrade)` : method,
          path: kubePath,
        });

        return approved
          ? { allowed: true }
          : {
              allowed: false,
              message: `ProLens did not allow ${session.providerName} to ${decision.action}: the user did not approve it. Ask the user to approve the command when ProLens prompts, or to run it themselves.`,
            };
      })();
    };
  },
});

export default aiSessionGateInjectable;
