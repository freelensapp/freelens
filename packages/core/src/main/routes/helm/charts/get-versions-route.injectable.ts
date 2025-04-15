/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { apiPrefix } from "../../../../common/vars";
import getHelmChartVersionsInjectable from "../../../helm/helm-service/get-helm-chart-versions.injectable";
import { route } from "../../../router/route";
import { getRouteInjectable } from "../../../router/router.injectable";

const getHelmChartVersionsRouteInjectable = getRouteInjectable({
  id: "get-helm-chart-versions-route",

  instantiate: (di) => {
    const getHelmChartVersions = di.inject(getHelmChartVersionsInjectable);

    return route({
      method: "get",
      path: `${apiPrefix}/v2/charts/{repo}/{chart}/versions`,
    })(async ({ params: { repo, chart } }) => ({
      response: await getHelmChartVersions(repo, chart),
    }));
  },
});

export default getHelmChartVersionsRouteInjectable;
