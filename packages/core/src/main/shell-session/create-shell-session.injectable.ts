/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import openPodTerminalSessionInjectable from "../../features/pod-terminal/main/open.injectable";
import openLocalShellSessionInjectable from "./local-shell-session/open.injectable";
import openNodeShellSessionInjectable from "./node-shell-session/open.injectable";
import openStandaloneShellSessionInjectable from "./standalone-shell-session/open.injectable";

import type WebSocket from "ws";

import type { Cluster } from "../../common/cluster/cluster";
import type { PodTerminalTarget } from "../../features/pod-terminal/common/pod-terminal";

export interface OpenShellSessionArgs {
  websocket: WebSocket;
  /**
   * Absent for a terminal opened outside of any cluster session.
   */
  cluster?: Cluster;
  tabId: string;
  nodeName?: string;
  /**
   * The container of a pod terminal, for a `kubectl exec` or `kubectl attach`.
   */
  podTerminal?: PodTerminalTarget;
}

export type OpenShellSession = (args: OpenShellSessionArgs) => Promise<void>;

const openShellSessionInjectable = getInjectable({
  id: "open-shell-session",

  instantiate: (di): OpenShellSession => {
    const openLocalShellSession = di.inject(openLocalShellSessionInjectable);
    const openNodeShellSession = di.inject(openNodeShellSessionInjectable);
    const openStandaloneShellSession = di.inject(openStandaloneShellSessionInjectable);
    const openPodTerminalSession = di.inject(openPodTerminalSessionInjectable);

    return ({ cluster, nodeName, podTerminal, ...args }) => {
      if (!cluster) {
        return openStandaloneShellSession(args);
      }

      if (podTerminal) {
        return openPodTerminalSession({ cluster, target: podTerminal, ...args });
      }

      return nodeName
        ? openNodeShellSession({ cluster, nodeName, ...args })
        : openLocalShellSession({ cluster, ...args });
    };
  },
});

export default openShellSessionInjectable;
