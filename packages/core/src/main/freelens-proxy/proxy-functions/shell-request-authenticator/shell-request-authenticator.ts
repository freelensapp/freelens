/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import crypto from "node:crypto";
import { promisify } from "node:util";
import { getOrInsertMap } from "@freelensapp/utilities";
import { ipcMainHandle } from "../../../../common/ipc";

import type { ClusterId } from "../../../../common/cluster-types";

const randomBytes = promisify(crypto.randomBytes);

/**
 * The scope every shell that belongs to no cluster is keyed under. A
 * `ClusterId` is a uuid, so this cannot collide with one, which is what keeps
 * a token minted for a cluster from authenticating a standalone request and
 * the other way around.
 */
export const standaloneShellScope = "@standalone";

export type ShellRequestScope = ClusterId | typeof standaloneShellScope;

export class ShellRequestAuthenticator {
  private tokens = new Map<ShellRequestScope, Map<string, Uint8Array>>();

  init() {
    ipcMainHandle("cluster:shell-api", (_event, clusterId: ClusterId, tabId: string) => this.mint(clusterId, tabId));
    ipcMainHandle("app:standalone-shell-api", (_event, tabId: string) => this.mint(standaloneShellScope, tabId));
  }

  private async mint(scope: ShellRequestScope, tabId: string): Promise<Uint8Array> {
    const authToken = Uint8Array.from(await randomBytes(128));
    const forScope = getOrInsertMap(this.tokens, scope);

    forScope.set(tabId, authToken);

    return authToken;
  }

  /**
   * Authenticates a single use token for creating a new shell
   * @param scope The `ClusterId` for the shell, or `standaloneShellScope` for
   * a shell that belongs to no cluster
   * @param tabId The ID for the shell
   * @param token The value that is being presented as a one time authentication token
   * @returns `true` if `token` was valid, false otherwise
   */
  authenticate = (scope: ShellRequestScope, tabId: string, token: string | undefined): boolean => {
    const scopeTokens = this.tokens.get(scope);

    if (!scopeTokens || !tabId || !token) {
      return false;
    }

    const authToken = scopeTokens.get(tabId);
    const buf = Uint8Array.from(Buffer.from(token, "base64"));

    if (authToken instanceof Uint8Array && authToken.length === buf.length && crypto.timingSafeEqual(authToken, buf)) {
      // remove the token because it is a single use token
      scopeTokens.delete(tabId);

      return true;
    }

    return false;
  };
}
