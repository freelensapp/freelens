/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type http from "node:http";
import type net from "node:net";

import type { SetRequired } from "type-fest";

import type { Cluster } from "../../../common/cluster/cluster";

export interface ProxyApiRequestArgs {
  req: SetRequired<http.IncomingMessage, "url" | "method">;
  socket: net.Socket;
  head: Buffer;
  cluster: Cluster;
}

/**
 * A shell request is the one upgrade that does not need a cluster: a terminal
 * can be opened outside of any cluster session.
 */
export interface ShellApiRequestArgs extends Omit<ProxyApiRequestArgs, "cluster"> {
  cluster?: Cluster;
}
