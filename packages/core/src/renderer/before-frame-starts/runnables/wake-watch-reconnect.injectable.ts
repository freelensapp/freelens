/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { reaction } from "mobx";
import hostedClusterInjectable from "../../cluster-frame-context/hosted-cluster.injectable";
import watchReconnectInjectable from "../../k8s/watch-reconnect/watch-reconnect.injectable";
import { beforeClusterFrameStartsSecondInjectionToken } from "../tokens";

// Signals that the cluster may answer again, so that waiting watches do not
// sit out the rest of a probe delay: the network coming back, the user coming
// back to the window (a laptop that woke up), and main finding the cluster
// online in its own periodic check.
const wakeWatchReconnectInjectable = getInjectable({
  id: "wake-watch-reconnect",
  instantiate: (di) => ({
    run: () => {
      const watchReconnect = di.inject(watchReconnectInjectable);
      const hostedCluster = di.inject(hostedClusterInjectable);

      window.addEventListener("online", () => watchReconnect.wake());
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          watchReconnect.wake();
        }
      });

      if (hostedCluster) {
        reaction(
          () => hostedCluster.online.get(),
          (online) => {
            if (online) {
              watchReconnect.wake();
            }
          },
        );
      }
    },
  }),
  injectionToken: beforeClusterFrameStartsSecondInjectionToken,
});

export default wakeWatchReconnectInjectable;
