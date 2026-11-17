/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { apiKubeInjectionToken } from "@freelensapp/kube-api";
import { getInjectable } from "@ogre-tools/injectable";
import { createWatchReconnect } from "./create-watch-reconnect";

// Longer than an answer of a working cluster ever takes, shorter than the next
// probe, so that a request lost on the network does not hold up the checks.
const probeTimeout = 5_000;

const watchReconnectInjectable = getInjectable({
  id: "watch-reconnect",
  instantiate: (di) =>
    createWatchReconnect({
      // The same way as the watches, through freelens-proxy, which answers 500
      // itself when it cannot reach the cluster. Any answer of the API server,
      // a 403 included, means it is up. `/version` is the cheapest request
      // every API server serves.
      probe: async () => {
        const apiKube = di.inject(apiKubeInjectionToken);
        const response = await apiKube.getResponse("/version", undefined, {
          signal: AbortSignal.timeout(probeTimeout),
        });

        // Read to the end, or the timeout aborts the unread body later, and
        // every probe shows up as a failed request. Both bodies are small, and
        // the status already said what the probe asks.
        await response.text().catch(() => {});

        return response.status < 500;
      },
    }),
});

export default watchReconnectInjectable;
