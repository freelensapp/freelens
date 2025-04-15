/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import crypto from "crypto";
import { promisify } from "util";
import { getOrInsertMap } from "@freelensapp/utilities";
import type { ClusterId } from "../../../../common/cluster-types";
import { ipcMainHandle } from "../../../../common/ipc";

const randomBytes = promisify(crypto.randomBytes);

export class ShellRequestAuthenticator {
  private tokens = new Map<ClusterId, Map<string, Uint8Array>>();

  init() {
    ipcMainHandle("cluster:shell-api", async (event, clusterId, tabId) => {
      const authToken = Uint8Array.from(await randomBytes(128));
      const forCluster = getOrInsertMap(this.tokens, clusterId);

      forCluster.set(tabId, authToken);

      return authToken;
    });
  }

  /**
   * Authenticates a single use token for creating a new shell
   * @param clusterId The `ClusterId` for the shell
   * @param tabId The ID for the shell
   * @param token The value that is being presented as a one time authentication token
   * @returns `true` if `token` was valid, false otherwise
   */
  authenticate = (clusterId: ClusterId, tabId: string, token: string | undefined): boolean => {
    const clusterTokens = this.tokens.get(clusterId);

    if (!clusterTokens || !tabId || !token) {
      return false;
    }

    const authToken = clusterTokens.get(tabId);
    const buf = Uint8Array.from(Buffer.from(token, "base64"));

    if (authToken instanceof Uint8Array && authToken.length === buf.length && crypto.timingSafeEqual(authToken, buf)) {
      // remove the token because it is a single use token
      clusterTokens.delete(tabId);

      return true;
    }

    return false;
  };
}
