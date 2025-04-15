/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { apiPrefix } from "../../../../common/vars";
import deleteClusterHelmReleaseInjectable from "../../../helm/helm-service/delete-helm-release.injectable";
import { clusterRoute } from "../../../router/route";
import { getRouteInjectable } from "../../../router/router.injectable";

const deleteReleaseRouteInjectable = getRouteInjectable({
  id: "delete-release-route",

  instantiate: (di) => {
    const deleteHelmRelease = di.inject(deleteClusterHelmReleaseInjectable);

    return clusterRoute({
      method: "delete",
      path: `${apiPrefix}/v2/releases/{namespace}/{name}`,
    })(async ({ cluster, params }) => ({
      response: await deleteHelmRelease(cluster, params),
    }));
  },
});

export default deleteReleaseRouteInjectable;
