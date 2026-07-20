/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { reactRootInjectionToken } from "@freelensapp/react-application";
import { getInjectable } from "@ogre-tools/injectable";
import closeRendererLogFileInjectable from "../../../features/population-of-logs-to-a-file/renderer/close-renderer-log-file.injectable";
import hostedClusterInjectable from "../../cluster-frame-context/hosted-cluster.injectable";
import frameTokenInjectable from "../../frames/cluster-frame/init-cluster-frame/frame-token/frame-token.injectable";
import currentlyInClusterFrameInjectable from "../../routes/currently-in-cluster-frame.injectable";
import { beforeFrameStartsSecondInjectionToken } from "../tokens";

const listenUnloadInjectable = getInjectable({
  id: "listen-unload",
  instantiate: (di) => ({
    run: () => {
      const closeRendererLogFile = di.inject(closeRendererLogFileInjectable);
      const isClusterFrame = di.inject(currentlyInClusterFrameInjectable);
      const logger = di.inject(loggerInjectionToken);
      const reactRoot = di.inject(reactRootInjectionToken);

      window.addEventListener("beforeunload", () => {
        if (isClusterFrame) {
          const hostedCluster = di.inject(hostedClusterInjectable);
          const frameToken = di.inject(frameTokenInjectable);

          logger.info(`[CLUSTER-FRAME] Unload dashboard, clusterId=${hostedCluster?.id}, frameToken=${frameToken}`);
        } else {
          logger.info("[ROOT-FRAME]: Unload app");
        }

        closeRendererLogFile();
        const rootElem = document.getElementById("app");

        if (rootElem) {
          reactRoot.unmount(rootElem);
        }
      });
    },
  }),
  injectionToken: beforeFrameStartsSecondInjectionToken,
});

export default listenUnloadInjectable;
