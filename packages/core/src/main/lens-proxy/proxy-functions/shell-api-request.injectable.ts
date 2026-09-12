/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import { WebSocketServer } from "ws";
import { debugContainerRequestValidator } from "../../../features/debug-containers/main/route.injectable";
import openShellSessionInjectable from "../../shell-session/create-shell-session.injectable";
import { messageOfError, terminalStatusReporterFor } from "../../shell-session/send-terminal-status";
import getClusterForRequestInjectable from "../get-cluster-for-request.injectable";
import { standaloneShellScope } from "./shell-request-authenticator/shell-request-authenticator";
import shellRequestAuthenticatorInjectable from "./shell-request-authenticator/shell-request-authenticator.injectable";

import type { LensProxyShellApiRequest } from "../lens-proxy";

const shellApiRequestInjectable = getInjectable({
  id: "shell-api-request",

  instantiate: (di): LensProxyShellApiRequest => {
    const openShellSession = di.inject(openShellSessionInjectable);
    const authenticateRequest = di.inject(shellRequestAuthenticatorInjectable).authenticate;
    const getClusterForRequest = di.inject(getClusterForRequestInjectable);
    const logger = di.inject(loggerInjectionToken);

    return ({ req, socket, head }) => {
      const { searchParams } = new URL(req.url ?? "", "http://localhost");
      const type = searchParams.get("type") ?? undefined;
      const nodeName = searchParams.get("node") ?? undefined;
      const shellToken = searchParams.get("shellToken") ?? undefined;
      const tabId = searchParams.get("id") ?? undefined;
      // A terminal opened outside of a cluster session has no cluster to look
      // up, and its token is minted under its own scope.
      const isStandalone = type === "standalone";
      const debugContainer =
        type === "debug-container"
          ? {
              namespace: searchParams.get("namespace") ?? "",
              name: searchParams.get("pod") ?? "",
              uid: searchParams.get("podUid") ?? "",
              containerName: searchParams.get("container") ?? "",
            }
          : undefined;
      const invalidDebugContainer =
        debugContainer && debugContainerRequestValidator.validate({ action: "stop", ...debugContainer }).error;
      const cluster = isStandalone ? undefined : getClusterForRequest(req);
      const scope = isStandalone ? standaloneShellScope : cluster?.id;
      const shellKind = isStandalone ? "standalone" : nodeName ? "node" : "local";

      if (invalidDebugContainer || !tabId || !scope || !authenticateRequest(scope, tabId, shellToken)) {
        socket.write("Invalid shell request");
        socket.end();
      } else {
        const ws = new WebSocketServer({ noServer: true });

        ws.handleUpgrade(req, socket, head, (websocket) => {
          openShellSession({
            websocket,
            cluster,
            tabId,
            // a node shell is a cluster concept by definition
            nodeName: isStandalone ? undefined : nodeName,
            ...(debugContainer ? { debugContainer } : {}),
          }).catch((error) => {
            logger.error(`[SHELL-SESSION]: failed to open a ${shellKind} shell`, error);

            // Otherwise the tab is left showing a status line for a session
            // that will never start, next to a "Restart session" button with
            // no stated reason.
            terminalStatusReporterFor(websocket).error(`Failed to open the shell session: ${messageOfError(error)}`);
          });
        });
      }
    };
  },
});

export default shellApiRequestInjectable;
