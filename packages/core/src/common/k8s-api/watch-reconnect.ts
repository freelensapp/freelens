/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { Disposer } from "@freelensapp/utilities";

/**
 * Decides when the failed watches of a cluster start again: quickly once the
 * cluster answers, without every watch asking it on its own while it does not.
 */
export interface WatchReconnect {
  /**
   * Calls `reconnect` once the watch may start again. `failures` counts the
   * failures of the watch in a row, since it last connected. The returned
   * disposer cancels the call, for a watch whose subscriber went away.
   */
  schedule(reconnect: () => void, failures: number): Disposer;

  /**
   * A watch connected: the cluster answers, so every waiting watch may start.
   */
  connected(): void;

  /**
   * True while the cluster did not answer the last check, so that a view can
   * say its data may be out of date.
   */
  readonly isClusterUnreachable: boolean;
}
