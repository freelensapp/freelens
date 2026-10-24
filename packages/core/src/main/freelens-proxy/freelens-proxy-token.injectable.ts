/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import randomBytesInjectable from "../../common/utils/random-bytes.injectable";
import { tokenMatches } from "./freelens-proxy-token";

export interface FreelensProxyToken {
  /**
   * The token a client of freelens-proxy has to present, generated once per
   * run and kept in memory only. 32 bytes as hex.
   */
  readonly value: string;
  /**
   * Whether `candidate` is the token, compared in constant time.
   */
  matches(candidate: string | undefined): boolean;
}

/**
 * The token required on requests to freelens-proxy. Every client carries it the
 * way it can: a terminal, kubectl and helm through the environment of the proxy
 * kubeconfig's exec plugin, the cluster frames as a cookie, and the main process
 * as a header. The handler checks it before anything reaches a cluster: for a
 * request after the cluster lookup, which only rewrites the `/<clusterId>/…`
 * path of kubectl and helm, so the check covers that path too, but before the
 * cluster's proxy starts; for an upgrade before the lookup. It strips the token
 * before forwarding.
 */
const freelensProxyTokenInjectable = getInjectable({
  id: "freelens-proxy-token",
  instantiate: (di): FreelensProxyToken => {
    const randomBytes = di.inject(randomBytesInjectable);
    const value = randomBytes(32).toString("hex");

    return {
      value,
      matches: (candidate) => tokenMatches(value, candidate),
    };
  },
});

export default freelensProxyTokenInjectable;
