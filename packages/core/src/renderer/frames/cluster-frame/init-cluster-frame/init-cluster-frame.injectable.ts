import assert from "assert";
import { loggerInjectionToken } from "@freelensapp/logger";
import { showErrorNotificationInjectable } from "@freelensapp/notifications";
/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import emitAppEventInjectable from "../../../../common/app-event-bus/emit-event.injectable";
import catalogEntityRegistryInjectable from "../../../api/catalog/entity/registry.injectable";
import hostedClusterInjectable from "../../../cluster-frame-context/hosted-cluster.injectable";
import loadExtensionsInjectable from "../../load-extensions.injectable";
import frameRoutingIdInjectable from "./frame-routing-id/frame-routing-id.injectable";
import { initClusterFrame } from "./init-cluster-frame";

const initClusterFrameInjectable = getInjectable({
  id: "init-cluster-frame",

  instantiate: (di) => {
    const hostedCluster = di.inject(hostedClusterInjectable);

    assert(hostedCluster, "This can only be injected within a cluster frame");

    return initClusterFrame({
      hostedCluster,
      loadExtensions: di.inject(loadExtensionsInjectable),
      catalogEntityRegistry: di.inject(catalogEntityRegistryInjectable),
      frameRoutingId: di.inject(frameRoutingIdInjectable),
      emitAppEvent: di.inject(emitAppEventInjectable),
      logger: di.inject(loggerInjectionToken),
      showErrorNotification: di.inject(showErrorNotificationInjectable),
    });
  },
});

export default initClusterFrameInjectable;
