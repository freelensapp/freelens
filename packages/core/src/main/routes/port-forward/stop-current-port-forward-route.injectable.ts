/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { apiPrefix } from "../../../common/vars";
import { clusterRoute } from "../../router/route";
import { getRouteInjectable } from "../../router/router.injectable";
import { PortForward } from "./functionality/port-forward";

const stopCurrentPortForwardRouteInjectable = getRouteInjectable({
  id: "stop-current-port-forward-route",

  instantiate: (di) => {
    const logger = di.inject(loggerInjectionToken);

    return clusterRoute({
      method: "delete",
      path: `${apiPrefix}/pods/port-forward/{namespace}/{resourceType}/{resourceName}`,
    })(async ({ params, query, cluster }) => {
      const { namespace, resourceType, resourceName } = params;
      const port = Number(query.get("port"));
      const forwardPort = Number(query.get("forwardPort"));
      const portForward = PortForward.getPortforward({
        clusterId: cluster.id,
        kind: resourceType,
        name: resourceName,
        namespace,
        port,
        forwardPort,
      });

      try {
        await portForward?.stop();

        return { response: { status: true } };
      } catch (error) {
        logger.error("[PORT-FORWARD-ROUTE]: error stopping a port-forward", {
          namespace,
          port,
          forwardPort,
          resourceType,
          resourceName,
        });

        return {
          error: {
            message: `error stopping a forward port ${port}`,
          },
        };
      }
    });
  },
});

export default stopCurrentPortForwardRouteInjectable;
