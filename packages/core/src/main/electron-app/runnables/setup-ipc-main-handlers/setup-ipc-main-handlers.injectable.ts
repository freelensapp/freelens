/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { onLoadOfApplicationInjectionToken } from "@freelensapp/application";
import { loggerInjectionToken } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import clusterFramesInjectable from "../../../../common/cluster-frames.injectable";
import applicationMenuItemCompositeInjectable from "../../../../features/application-menu/main/application-menu-item-composite.injectable";
import clustersInjectable from "../../../../features/cluster/storage/common/clusters.injectable";
import getClusterByIdInjectable from "../../../../features/cluster/storage/common/get-by-id.injectable";
import pushCatalogToRendererInjectable from "../../../catalog-sync-to-renderer/push-catalog-to-renderer.injectable";
import { setupIpcMainHandlers } from "./setup-ipc-main-handlers";
import clusterConnectionInjectable from "../../../cluster/cluster-connection.injectable";

const setupIpcMainHandlersInjectable = getInjectable({
  id: "setup-ipc-main-handlers",

  instantiate: (di) => ({
    run: () => {
      const logger = di.inject(loggerInjectionToken);

      logger.debug("[APP-MAIN] initializing ipc main handlers");

      setupIpcMainHandlers({
        applicationMenuItemComposite: di.inject(applicationMenuItemCompositeInjectable),
        pushCatalogToRenderer: di.inject(pushCatalogToRendererInjectable),
        clusters: di.inject(clustersInjectable),
        getClusterById: di.inject(getClusterByIdInjectable),
        clusterFrames: di.inject(clusterFramesInjectable),

        refreshClusterAccessibility: async (clusterId) => {
          const getClusterById = di.inject(getClusterByIdInjectable);
          const cluster = getClusterById(clusterId);

          if (!cluster) return;

          const connection = di.inject(clusterConnectionInjectable, cluster);
          await connection.refreshAccessibilityAndMetadata();
        },
      });
    },
  }),

  injectionToken: onLoadOfApplicationInjectionToken,
  causesSideEffects: true,
});

export default setupIpcMainHandlersInjectable;
