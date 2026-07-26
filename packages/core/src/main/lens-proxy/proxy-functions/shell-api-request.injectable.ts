/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import { WebSocketServer } from "ws";
import openShellSessionInjectable from "../../shell-session/create-shell-session.injectable";
import { messageOfError, terminalStatusReporterFor } from "../../shell-session/send-terminal-status";
import getClusterForRequestInjectable from "../get-cluster-for-request.injectable";
import shellRequestAuthenticatorInjectable from "./shell-request-authenticator/shell-request-authenticator.injectable";

import type { LensProxyApiRequest } from "../lens-proxy";

const shellApiRequestInjectable = getInjectable({
  id: "shell-api-request",

  instantiate: (di): LensProxyApiRequest => {
    const openShellSession = di.inject(openShellSessionInjectable);
    const authenticateRequest = di.inject(shellRequestAuthenticatorInjectable).authenticate;
    const getClusterForRequest = di.inject(getClusterForRequestInjectable);
    const logger = di.inject(loggerInjectionToken);

    return ({ req, socket, head }) => {
      const cluster = getClusterForRequest(req);
      const { searchParams } = new URL(req.url ?? "", "http://localhost");
      const nodeName = searchParams.get("node") ?? undefined;
      const shellToken = searchParams.get("shellToken") ?? undefined;
      const tabId = searchParams.get("id") ?? undefined;

      if (!tabId || !cluster || !authenticateRequest(cluster.id, tabId, shellToken)) {
        socket.write("Invalid shell request");
        socket.end();
      } else {
        const ws = new WebSocketServer({ noServer: true });

        ws.handleUpgrade(req, socket, head, (websocket) => {
          openShellSession({ websocket, cluster, tabId, nodeName }).catch((error) => {
            logger.error(`[SHELL-SESSION]: failed to open a ${nodeName ? "node" : "local"} shell`, error);

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
