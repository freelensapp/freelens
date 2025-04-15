/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { apiPrefix } from "../../../../common/vars";
import getClusterHelmReleaseValuesInjectable from "../../../helm/helm-service/get-helm-release-values.injectable";
import { clusterRoute } from "../../../router/route";
import { contentTypes } from "../../../router/router-content-types";
import { getRouteInjectable } from "../../../router/router.injectable";
import { getBoolean } from "../../../utils/parse-query";

const getReleaseRouteValuesInjectable = getRouteInjectable({
  id: "get-release-values-route",

  instantiate: (di) => {
    const getClusterHelmReleaseValues = di.inject(getClusterHelmReleaseValuesInjectable);

    return clusterRoute({
      method: "get",
      path: `${apiPrefix}/v2/releases/{namespace}/{name}/values`,
    })(async ({ cluster, params: { namespace, name }, query }) => ({
      response: await getClusterHelmReleaseValues(cluster, {
        name,
        namespace,
        all: getBoolean(query, "all"),
      }),

      contentType: contentTypes.txt,
    }));
  },
});

export default getReleaseRouteValuesInjectable;
