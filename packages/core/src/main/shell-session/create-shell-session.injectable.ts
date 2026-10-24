/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import openLocalShellSessionInjectable from "./local-shell-session/open.injectable";
import openNodeShellSessionInjectable from "./node-shell-session/open.injectable";
import openStandaloneShellSessionInjectable from "./standalone-shell-session/open.injectable";

import type WebSocket from "ws";

import type { Cluster } from "../../common/cluster/cluster";

export interface OpenShellSessionArgs {
  websocket: WebSocket;
  /**
   * Absent for a terminal opened outside of any cluster session.
   */
  cluster?: Cluster;
  tabId: string;
  nodeName?: string;
}

export type OpenShellSession = (args: OpenShellSessionArgs) => Promise<void>;

const openShellSessionInjectable = getInjectable({
  id: "open-shell-session",

  instantiate: (di): OpenShellSession => {
    const openLocalShellSession = di.inject(openLocalShellSessionInjectable);
    const openNodeShellSession = di.inject(openNodeShellSessionInjectable);
    const openStandaloneShellSession = di.inject(openStandaloneShellSessionInjectable);

    return ({ cluster, nodeName, ...args }) => {
      if (!cluster) {
        return openStandaloneShellSession(args);
      }

      return nodeName
        ? openNodeShellSession({ cluster, nodeName, ...args })
        : openLocalShellSession({ cluster, ...args });
    };
  },
});

export default openShellSessionInjectable;
